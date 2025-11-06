# Camera Permissions Setup for React Native

## Android Camera Permissions

Since you don't have the `AndroidManifest.xml` file in your project structure, you'll need to add it manually to configure camera permissions.

### Steps to Add Camera Permissions:

1. **Create the Android Manifest file** at this location:
   ```
   android/app/src/main/AndroidManifest.xml
   ```

2. **Add the following content**:
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <manifest xmlns:android="http://schemas.android.com/apk/res/android"
       package="com.hakikisha">

       <!-- Camera Permissions -->
       <uses-permission android:name="android.permission.CAMERA" />
       <uses-feature android:name="android.hardware.camera" android:required="false" />
       <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
       
       <!-- Storage Permissions -->
       <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
       <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
       
       <!-- Network Permissions -->
       <uses-permission android:name="android.permission.INTERNET" />
       <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

       <application
           android:name=".MainApplication"
           android:label="@string/app_name"
           android:icon="@mipmap/ic_launcher"
           android:roundIcon="@mipmap/ic_launcher_round"
           android:allowBackup="false"
           android:theme="@style/AppTheme">
           
           <activity
               android:name=".MainActivity"
               android:label="@string/app_name"
               android:configChanges="keyboard|keyboardHidden|orientation|screenSize|uiMode"
               android:launchMode="singleTask"
               android:windowSoftInputMode="adjustResize"
               android:exported="true">
               <intent-filter>
                   <action android:name="android.intent.action.MAIN" />
                   <category android:name="android.intent.category.LAUNCHER" />
               </intent-filter>
           </activity>
       </application>
   </manifest>
   ```

## iOS Camera Permissions

1. **Update Info.plist** at `ios/front_end/Info.plist`:
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>Hakikisha needs access to your camera to capture images for fact-checking claims.</string>
   <key>NSPhotoLibraryUsageDescription</key>
   <string>Hakikisha needs access to your photo library to select images for fact-checking.</string>
   <key>NSPhotoLibraryAddUsageDescription</key>
   <string>Hakikisha needs permission to save images to your photo library.</string>
   ```

## React Native Camera Library Setup

Make sure you have the required camera library installed:

```bash
npm install react-native-image-picker
# OR
yarn add react-native-image-picker
```

For Android 11+ (API level 30+), also add to `AndroidManifest.xml`:
```xml
<queries>
  <intent>
    <action android:name="android.media.action.IMAGE_CAPTURE" />
  </intent>
</queries>
```

## Rebuild the App

After adding permissions, rebuild your app:
```bash
# For Android
npx react-native run-android

# For iOS
cd ios && pod install && cd ..
npx react-native run-ios
```

## Runtime Permission Handling

The camera permissions are already handled in your app code with `PermissionsAndroid.request()`. The manifest permissions enable this runtime permission request to work properly.
