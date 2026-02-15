package com.reactlibrary;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;
import android.database.Cursor;
import android.net.Uri;

import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.Arrays;

public class RNExpoReadSmsModule extends ReactContextBaseJavaModule {

  private final ReactApplicationContext reactContext;
  private BroadcastReceiver msgReceiver;
  public static final String NAME = "RNExpoReadSms";

  public RNExpoReadSmsModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
  }

  @Override
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void startReadSMS(final Callback success, final Callback error) {
    try{
      if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
              && ContextCompat.checkSelfPermission(reactContext, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED) {
        msgReceiver = new BroadcastReceiver() {
          @Override
          public void onReceive(Context context, Intent intent) {
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("received_sms", getMessageFromMessageIntent(intent));
          }
        };
        String SMS_RECEIVED_ACTION = "android.provider.Telephony.SMS_RECEIVED";
        if(Build.VERSION.SDK_INT >= 34 && reactContext.getApplicationInfo().targetSdkVersion >= 34) {
          reactContext.registerReceiver(msgReceiver, new IntentFilter(SMS_RECEIVED_ACTION), Context.RECEIVER_EXPORTED);
        } else {
          reactContext.registerReceiver(msgReceiver, new IntentFilter(SMS_RECEIVED_ACTION));
        }
        success.invoke("Start Read SMS successfully");
      } else {
        // Permission has not been granted
        error.invoke("Required RECEIVE_SMS and READ_SMS permission");
      }
    } catch (Exception e){
      e.printStackTrace();
    }
  }

  @ReactMethod
  public void stopReadSMS() {
    try {
      if (reactContext != null && msgReceiver != null) {
        reactContext.unregisterReceiver(msgReceiver);
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  // Method to read existing SMS messages
  @ReactMethod
  public void readSms(int count, Promise promise) {
    if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
      promise.reject("PERMISSION_DENIED", "READ_SMS permission not granted.");
      return;
    }

    WritableArray smsList = Arguments.createArray();
    Uri uri = Uri.parse("content://sms/inbox");
    Cursor cursor = null;
    try {
      cursor = reactContext.getContentResolver().query(uri, null, null, null, "date DESC LIMIT " + count);
      if (cursor != null && cursor.moveToFirst()) {
        do {
          WritableMap sms = Arguments.createMap();
          sms.putString("address", cursor.getString(cursor.getColumnIndexOrThrow("address")));
          sms.putString("body", cursor.getString(cursor.getColumnIndexOrThrow("body")));
          sms.putDouble("date", cursor.getLong(cursor.getColumnIndexOrThrow("date")));
          sms.putInt("type", cursor.getInt(cursor.getColumnIndexOrThrow("type"))); // 1 for inbox, 2 for sent
          smsList.pushMap(sms);
        } while (cursor.moveToNext());
      }
      promise.resolve(smsList);
    } catch (Exception e) {
      Log.e(NAME, "Error reading SMS: " + e.getMessage());
      promise.reject("SMS_READ_ERROR", "Failed to read SMS messages: " + e.getMessage());
    } finally {
      if (cursor != null) {
        cursor.close();
      }
    }
  }

  private String getMessageFromMessageIntent(Intent intent) {
    final Bundle bundle = intent.getExtras();
    
    /*
      Index 0 - to have originating Address
      Index 1 - to have message body
    */

    String SMSReturnValues [] = new String [2];

    try {
      if (bundle != null) {
        final Object[] pdusObj = (Object[]) bundle.get("pdus");
        if (pdusObj != null) {
          for (Object aPdusObj : pdusObj) {
            SmsMessage currentMessage = SmsMessage.createFromPdu((byte[]) aPdusObj);
            SMSReturnValues[0] = currentMessage.getDisplayOriginatingAddress();
            SMSReturnValues[1] = currentMessage.getDisplayMessageBody();
          }
        }
      }
      Log.i("ReadSMSModule", "SMS Originating Address received is:"+SMSReturnValues[0]);
      Log.i("ReadSMSModule", "SMS received is:"+SMSReturnValues[1]);
    } catch (Exception e) {
      e.printStackTrace();
    }

    final String finalSMSReturnValues = Arrays.toString(SMSReturnValues);
    return finalSMSReturnValues;
  }
}
