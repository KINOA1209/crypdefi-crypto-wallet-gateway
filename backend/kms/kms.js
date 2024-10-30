const {
  KMSClient,
  CreateKeyCommand,
  GetPublicKeyCommand,
  SignCommand,
} = require("@aws-sdk/client-kms");
const asn1js = require("asn1js");
const keccak256 = require("keccak256");
const BN = require("bn.js");
const ethutil = require("@ethereumjs/util");
const { addHexPrefix } = require("@ethereumjs/util");
const { Transaction } = require("@ethereumjs/tx");
const { Common } = require("@ethereumjs/common");
const { Web3 } = require("web3");

require("dotenv").config();

const web3 = new Web3(
  process.env.RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"
);
const kms = new KMSClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey:
      process.env.SECRET_ACCESS_KEY,
  },
});

const chainId = process.env.CHAIN_ID || 11155111;
const common = chainId ? new Common({ chain: +chainId }) : undefined;

async function createKey() {
  const response = await kms.send(
    new CreateKeyCommand({
      KeySpec: "ECC_SECG_P256K1",
      KeyUsage: "SIGN_VERIFY",
    })
  );
  if (!response.KeyMetadata?.KeyId) {
    throw new Error("AWSKMS: KeyId not exist.");
  }
  return response.KeyMetadata?.KeyId;
}

async function getDerPublickey(KeyId) {
  const key = await kms.send(
    new GetPublicKeyCommand({
      KeyId: KeyId,
    })
  );
  if (!key.PublicKey) {
    throw new Error("AWSKMS: PublicKey is undefined.");
  }
  return Buffer.from(key.PublicKey);
}

function decryptPublickeyDerEncoding(input) {
  /**
   * Before calculating the Ethereum address, we need to get the raw value of the public key.
   * the input returns a DER-encoded X.509 public key
   * asSubjectPublickeyInfo (SPKI), as defined in RFC 5280.
   * Use an ASN1 library that allows us to define this as a schema as `OBJECT IDENTIFIER `
   * https://www.rfc-editor.org/rfc/rfc5480#section-2
   */
  const schema = new asn1js.Sequence({
    value: [
      new asn1js.Sequence({ value: [new asn1js.ObjectIdentifier()] }),
      new asn1js.BitString({ name: "objectIdentifier" }),
    ],
  });
  const parsed = asn1js.verifySchema(input, schema);
  if (!parsed.verified) {
    throw new Error(`Publickey: failed to parse. ${parsed.result.error}`);
  }
  const objectIdentifier = parsed.result.objectIdentifier.valueBlock.valueHex;

  /**
   * According to section 2.2 of RFC 5480, the first byte, 0x04 indicates that this is an uncompressed key.
   * We need to remove this byte for the public key to be correct. Once we delete the first byte, we get the
   * raw public key that can be used to calculate our Ethereum address.
   */
  const publickey = objectIdentifier.slice(1); // remove 0x04

  /**
   * Returns the wallet's public key buffer
   */
  return Buffer.from(publickey);
}

function publickeyToAddress(input) {
  console.log(keccak256(input).toString("hex"));
  const hash = Buffer.from(keccak256(input).toString("hex"), "hex");
  const address = "0x" + hash.slice(-20).toString("hex");
  return address;
}

async function signDigest(KeyId, digest) {
  const response = await kms.send(
    new SignCommand({
      KeyId: KeyId,
      Message: digest,
      MessageType: "DIGEST",
      SigningAlgorithm: "ECDSA_SHA_256",
    })
  );
  if (!response.Signature) {
    throw new Error("AWSKMS: Signature is undefined.");
  }
  return Buffer.from(response.Signature);
}

function decodeRS(signature) {
  /**
   * According to section 2.2.3 of RFC 3279 this function expects to find two integers r and s
   * in the signature that will be returned as two BigNumber (BN.js) objects.
   */
  const schema = new asn1js.Sequence({
    value: [
      new asn1js.Integer({ name: "r" }),
      new asn1js.Integer({ name: "s" }),
    ],
  });
  const parsed = asn1js.verifySchema(signature, schema);
  if (!parsed.verified) {
    throw new Error(`USignatureECDSA: failed to parse. ${parsed.result.error}`);
  }

  /**
   * The result represents a point on the elliptic curve where r represents the x coordinate and s represents y.
   */
  const r = new BN(Buffer.from(parsed.result.r.valueBlock.valueHex));
  let s = new BN(Buffer.from(parsed.result.s.valueBlock.valueHex));

  /**
   * Because of EIP-2 not all elliptic curve signatures are accepted, the value of s needs to be SMALLER than half of the curve
   */
  let secp256k1N = new BN(
    "fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141",
    16
  ); // max value on the curve
  let secp256k1halfN = secp256k1N.div(new BN(2)); // half of the curve
  if (s.gt(secp256k1halfN)) {
    // if s is great than half of the curve, we need to invert it.
    // According to EIP2 https://github.com/ethereum/EIPs/blob/master/EIPS/eip-2.md
    s = secp256k1N.sub(s);
  }
  return { r: r.toBuffer(), s: s.toBuffer() };
}

function calculateV(address, digest, r, s, chainId) {
  /**
   * This is the function to find the right v value
   * There are two matching signatues on the elliptic curve
   * we need to find the one that matches to our public key
   * it can be v = `candidate_1` or v = `candidate_2`
   */
  const candidate_1 = chainId ? chainId * BigInt(2) + BigInt(35) : BigInt(27);
  const candidate_2 = chainId ? chainId * BigInt(2) + BigInt(36) : BigInt(28);
  if (
    Buffer.compare(
      address,
      ethutil.publicToAddress(
        ethutil.ecrecover(digest, candidate_1, r, s, chainId)
      )
    ) === 0
  ) {
    return candidate_1;
  } else if (
    Buffer.compare(
      address,
      ethutil.publicToAddress(
        ethutil.ecrecover(digest, candidate_2, r, s, chainId)
      )
    ) === 0
  ) {
    return candidate_2;
  } else {
    return BigInt(-1);
  }
}

async function createNewKey() {
  const keyID = await createKey();
  const derPublickey = await getDerPublickey(keyID);
  const publickey = decryptPublickeyDerEncoding(derPublickey);
  const address = publickeyToAddress(publickey);
  return { keyID, address };
}

async function signTransaction(account, txData) {
  // use Transaction library for serialize txData
  const digest = Transaction.fromTxData(txData, {
    common: common,
  }).getMessageToSign();

  const { r, s } = decodeRS(await signDigest(account.KeyId, digest));
  const v = calculateV(account.address, digest, r, s, BigInt(chainId));

  const signed = Transaction.fromTxData(
    { ...txData, r, s, v },
    { common: common }
  );

  return addHexPrefix(signed.serialize().toString("hex"));
}

module.exports = {
  createNewKey,
  signTransaction,
  web3,
};
