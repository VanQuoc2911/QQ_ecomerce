# Using a local Gradle ZIP to avoid network downloads

If your environment blocks downloads from `services.gradle.org` (UnknownHostException), you can avoid the Gradle wrapper's network fetch by using a local Gradle distribution ZIP and pointing the wrapper at it.

Options:

- Manual download + place in Gradle user home:
  - Download `gradle-9.0.0-bin.zip` from a machine with internet (https://services.gradle.org/distributions/).
  - Create the folder structure under your Gradle user home: `%USERPROFILE%\.gradle\wrapper\dists\gradle-9.0.0-bin\<any>` and place the ZIP there. The wrapper may still check hashes.

- Use the provided script `use-local-gradle.cmd` (Windows):
  - From repository `Shipper\scripts` run:

```cmd
use-local-gradle.cmd C:\path\to\gradle-9.0.0-bin.zip
```

  - The script updates `android/gradle/wrapper/gradle-wrapper.properties` so `distributionUrl` points to the local file. After running, do:

```cmd
cd ..
npx react-native run-android
```

- Configure a proxy for Gradle (if your network uses a proxy):
  - Set environment variables in the same `cmd` session before running the build:

```cmd
set HTTPS_PROXY=http://proxy.example.com:8080
set HTTP_PROXY=http://proxy.example.com:8080
npx react-native run-android
```

  - Or add the proxy to `gradle.properties` (user or project):

```
systemProp.http.proxyHost=proxy.example.com
systemProp.http.proxyPort=8080
systemProp.https.proxyHost=proxy.example.com
systemProp.https.proxyPort=8080
```

Notes:

- The script is a convenience for Windows only. It edits `android/gradle/wrapper/gradle-wrapper.properties` to use a `file:/` URL pointing to your ZIP.
- Using a local file avoids network issues but requires you to obtain the correct Gradle ZIP (matching the version in the original `distributionUrl`).
- If you prefer, I can update the wrapper file directly in the repo to point at a local path you provide, or add a script for Unix shells.
