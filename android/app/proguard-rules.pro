# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# --- OmniQ R8 optimisation rules ---

# Hermes / JSI bridge. Stripping these breaks the JS runtime at launch.
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# React Native core: native modules are resolved reflectively, so R8 cannot
# see the call sites and will otherwise strip them.
-keep,includedescriptorclasses class com.facebook.react.bridge.** { *; }
-keep,includedescriptorclasses class com.facebook.react.uimanager.** { *; }
-keepclassmembers class * { @com.facebook.react.bridge.ReactMethod *; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactProp *; }

# react-native-gesture-handler / safe-area-context / svg / flash-list
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }
-keep class com.horcrux.svg.** { *; }
-keep class com.shopify.reactnative.flash_list.** { *; }

# expo-image (Glide-backed): Glide's generated API is reflective.
-keep public class * implements com.bumptech.glide.module.GlideModule
-keep class * extends com.bumptech.glide.module.AppGlideModule { <init>(...); }
-keep public enum com.bumptech.glide.load.ImageHeaderParser$** { **[] $VALUES; public *; }

# OkHttp / Okio — used by the Supabase client and axios' native transport.
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**

# Keep annotated JS-facing members and enum plumbing.
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep source line numbers so Play Console crash traces stay readable,
# while still hiding original file names.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Add any project specific keep options here:
