/* eslint-disable import/no-anonymous-default-export */
import {
  REGISTER_SUCCESS,
  REGISTER_FAIL,
  USER_LOADED,
  AUTH_ERROR,
  LOGIN_SUCCESS,
  LOGIN_FAIL,
  LOGOUT,
  ACCOUNT_DELETED,
  SET_IS_LOADING,
  SET_WALLET,
  SET_SIGNED_TX,
  WALLET_ERROR,
  SIGN_ERROR,
} from "../actions/types";

const initialState = {
  token: localStorage.getItem("token"),
  isAuthenticated: null,
  loading: true,
  user: null,
  signedTx: null,
};

export default function (state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case USER_LOADED:
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: payload,
      };
    case SET_WALLET:
      return {
        ...state,
        loading: false,
        user: { ...state.user, wallets: payload },
      };
    case SET_SIGNED_TX:
      return {
        ...state,
        loading: false,
        signedTx: payload,
      };
    case SET_IS_LOADING:
      return {
        ...state,
        loading: payload,
      };
    case REGISTER_SUCCESS:
    case LOGIN_SUCCESS:
      localStorage.setItem("token", payload.token);
      return {
        ...state,
        ...payload,
        isAuthenticated: true,
        loading: false,
      };
    case REGISTER_FAIL:
    case AUTH_ERROR:
    case LOGIN_FAIL:
    case LOGOUT:
    case ACCOUNT_DELETED:
      localStorage.removeItem("token");
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case WALLET_ERROR:
      return {
        ...state,
        loading: false,
      };
    case SIGN_ERROR:
      return {
        ...state,
        loading: false,
      };
    default:
      return state;
  }
}
