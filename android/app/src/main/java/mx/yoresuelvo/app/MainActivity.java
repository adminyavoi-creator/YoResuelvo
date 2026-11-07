package mx.yoresuelvo.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NativeSessionPlugin.class);
        registerPlugin(NativeAgreementPlugin.class);
        registerPlugin(NativeGoogleAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
