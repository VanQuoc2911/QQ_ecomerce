import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Dashboard from '../screens/Dashboard';
import ForgotPasswordScreen from '../screens/ForgotPassword';
import LoginScreen from '../screens/Login';
import OrderDetail from '../screens/OrderDetail';
import OrdersList from '../screens/OrdersList';
import ProfileScreen from '../screens/Profile';
import RegisterScreen from '../screens/Register';

import { navigationRef } from './RootNavigation';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={Dashboard} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Orders" component={OrdersList} />
            <Stack.Screen name="OrderDetail" component={OrderDetail} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
