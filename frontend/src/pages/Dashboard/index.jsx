import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setAlert } from "../../actions/alert";
import { addWallet, signTx } from "../../actions/auth";
import { Spinner } from "../../components/common";
const { Web3 } = require("web3");

const web3 = new Web3(
  process.env.RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"
);

export const Dashboard = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, user, signedTx } = useSelector(
    (state) => state.auth
  );

  const [formData, setFormData] = useState({
    walletIndex: "-1",
    transactionTo: "0x8e03e405b2c7556201Ba2B03BC2ceA69173f1691",
    transactionValue: "100",
    transactionData: "",
  });

  const [balances, setBalances] = useState([]);

  const { walletIndex, transactionTo, transactionValue, transactionData } =
    formData;

  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    if (walletIndex === "-1") {
      dispatch(setAlert("Please select wallet", "danger"));
      return;
    }
    dispatch(
      signTx({
        walletIndex,
        walletID: user.wallets[walletIndex]._id,
        transactionTo,
        transactionValue: Number(transactionValue),
        transactionData,
      })
    );
  };

  const createWallet = () => {
    dispatch(addWallet());
  };

  const getBalances = async (wallets) => {
    const tempBalances = await Promise.all(
      wallets.map((wallet) => web3.eth.getBalance(wallet.address))
    );
    console.log(tempBalances);
    setBalances(tempBalances);
  };

  useEffect(() => {
    if (!user) return;
    if (!user.wallets) return;
    getBalances(user.wallets);
  }, [user, signedTx]);

  if (!isAuthenticated && !loading) {
    return <Navigate to="/login" />;
  }

  return (
    <section className="landing">
      <div className="dark-overlay">
        <div className="landing-inner">
          <div className="form-box width-dashboard">
            <h1 className="large text-primary">My Wallets</h1>
            <form className="form" onSubmit={(e) => onSubmit(e)}>
              <select name="walletIndex" onChange={(e) => onChange(e)}>
                <option value={-1} style={{ height: "200px" }}>
                  Please select a wallet
                </option>
                {user &&
                  (user.wallets && user.wallets.length
                    ? user.wallets.map((wallet, index) => (
                        <option key={index} value={index}>
                          {wallet.address}(
                          {Math.round(Number(balances[index]) / 1000_000_000)}
                          GWei)
                        </option>
                      ))
                    : null)}
              </select>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="To"
                  name="transactionTo"
                  value={transactionTo}
                  onChange={(e) => onChange(e)}
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="number"
                  placeholder="Value"
                  name="transactionValue"
                  value={transactionValue}
                  onChange={(e) => onChange(e)}
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Data : 0x..."
                  name="transactionData"
                  value={transactionData}
                  onChange={(e) => onChange(e)}
                />
              </div>
              {user && (
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Signed Transaction"
                    name="signedTx"
                    value={signedTx || ""}
                    disabled
                  />
                </div>
              )}
              <div className="form-group button-group">
                {loading ? (
                  <Spinner />
                ) : (
                  <>
                    <input
                      type="button"
                      className="btn btn-primary btn-full btn-half"
                      value="Create Wallet"
                      onClick={createWallet}
                    />
                    <input
                      type="submit"
                      className="btn btn-primary btn-full btn-half"
                      value="Sign Transaction"
                    />
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
