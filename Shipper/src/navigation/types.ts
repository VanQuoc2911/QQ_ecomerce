export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Orders: { available?: boolean } | undefined;
  OrderDetail: { orderId: string };
  Dashboard: undefined;
  Profile: undefined;
};

export default RootStackParamList;
