package mx.yoresuelvo.app;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayInputStream;

@CapacitorPlugin(name = "NativeAgreement")
public class NativeAgreementPlugin extends Plugin {
    private WebView printView;

    @PluginMethod
    public void print(PluginCall call) {
        String html = call.getString("html");
        if (html == null || html.length() > 200000) {
            call.reject("El acuerdo no está disponible para impresión.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (printView != null) {
                call.reject("Termina la impresión anterior.");
                return;
            }
            PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
            if (manager == null) { call.reject("Impresión no disponible."); return; }
            WebView view = new WebView(getActivity());
            printView = view;
            view.getSettings().setJavaScriptEnabled(false);
            view.getSettings().setAllowFileAccess(false);
            view.getSettings().setAllowContentAccess(false);
            view.getSettings().setBlockNetworkLoads(true);
            view.setWebViewClient(new WebViewClient() {
                private boolean started;
                @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return true; }
                @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                    return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
                }
                @Override public void onPageFinished(WebView v, String url) {
                    if (started) return;
                    started = true;
                    String name = "YoResuelvo - Acuerdo";
                    PrintDocumentAdapter delegate = v.createPrintDocumentAdapter(name);
                    PrintDocumentAdapter adapter = new PrintDocumentAdapter() {
                        @Override public void onStart() { delegate.onStart(); }
                        @Override public void onLayout(PrintAttributes oldAttrs, PrintAttributes newAttrs, android.os.CancellationSignal cancel, LayoutResultCallback callback, android.os.Bundle extras) {
                            delegate.onLayout(oldAttrs, newAttrs, cancel, callback, extras);
                        }
                        @Override public void onWrite(android.print.PageRange[] pages, android.os.ParcelFileDescriptor destination, android.os.CancellationSignal cancel, WriteResultCallback callback) {
                            delegate.onWrite(pages, destination, cancel, callback);
                        }
                        @Override public void onFinish() {
                            delegate.onFinish();
                            v.destroy();
                            printView = null;
                        }
                    };
                    try {
                        manager.print(name, adapter, new PrintAttributes.Builder().build());
                        call.resolve();
                    } catch (Exception error) {
                        v.destroy(); printView = null;
                        call.reject("No se pudo abrir la impresión.", error);
                    }
                }
            });
            view.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
        });
    }
    @Override protected void handleOnDestroy() {
        if (printView != null) { printView.destroy(); printView = null; }
    }
}
