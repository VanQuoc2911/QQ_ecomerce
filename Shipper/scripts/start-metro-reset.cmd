@echo off
REM start-metro-reset.cmd
REM Starts the React Native Metro bundler from the Shipper project root with cache reset.

REM Usage: run this in a separate terminal before running the Android build.

pushd %~dp0..
echo Starting Metro in %CD% (reset cache)...
npx react-native start --reset-cache
popd
