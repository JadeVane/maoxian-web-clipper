
const ClippingHandler_NativeApp = (function(){
  const APP_NAME = 'maoxian_web_clipper_native';
  const state = {};

  function handle(task) {
    task.type = ['download', task.type].join('.');
    state.port.postMessage(task);
  }

  function responseHandler(resp){
    Log.debug(resp);
    switch(resp.type) {
      case 'download.text':
      case 'download.url':
        const filename = T.sanitizePath(resp.filename);
        if(  filename.endsWith('.html') && !filename.endsWith('.frame.html')
          || filename.endsWith('.md')){
          updateDownloadFold(filename);
          state.completedAction(state.tabId, { handler: 'native-app', filename: filename});
        }
        break;
      case 'get.version':
        if(state.getVersionCallback){
          state.getVersionCallback({ ok: true, version: resp.version });
        }
        break;
      case 'get.downloadFold':
        const downloadFold = T.sanitizePath(resp.downloadFold);
        updateDownloadFold(downloadFold);
        break;
      default: break;
    }
  }

  // reset state.port when native application disconnected.
  function disconnectHandler(port) {
    let errorMessage = null;
    if(browser.runtime.lastError){
      errorMessage = "NativeApp: DisconnectErr:" + browser.runtime.lastError.message;
    }
    if(port.error){
      errorMessage = "NativeApp: DisconnectErr:" + port.error.message;
    }
    if(errorMessage) {
      Log.error(errorMessage);
      if(state.disconnectCallback) {
        state.disconnectCallback(errorMessage);
      }
    }
    state.port = null;
  }

  function setCompletedAction(handler) {
    state.completedAction = handler;
  }

  function updateDownloadFold(filename) {
    const downloadFold = filename.split('mx-wc')[0];
    MxWcStorage.set('downloadFold', downloadFold);
  }

  function initDownloadFold(){
    init();
    state.port.postMessage({type: 'get.downloadFold'})
  }

  function getVersion(callback) {
    init();
    try{
      state.getVersionCallback = callback;
      state.disconnectCallback = function(message) {
        callback({ok: false, message: message});
      }
      state.port.postMessage({type: 'get.version'})
    } catch(e) {
      // avoid other exception
      callback({ ok: false, message: e.message })
    }
  }


  function init(tabId, clipId){
    state.tabId = tabId;
    state.clipId = clipId;
    if(!state.port){
      state.port = chrome.runtime.connectNative(APP_NAME);
      state.port.onMessage.addListener(responseHandler);
      state.port.onDisconnect.addListener(disconnectHandler);
    }
  }

  return {
    name: 'native-app',
    init: init,
    handle: handle,
    setCompletedAction: setCompletedAction,
    initDownloadFold: initDownloadFold,
    getVersion: getVersion
  }
})();
