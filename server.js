var oSipStack, oSipSessionRegister, oSipSessionCall;
var videoRemote, videoLocal, audioRemote;
var bFullScreen = false;
var bDisableVideo = false;
var oConfigCall;
var txtPrivateIdentity,
  txtPhoneNumber,
  txtPublicIdentity,
  txtPassword,
  txtRealm,
  txtDisplayName,
  txtWebsocketServerUrl,
  txtSIPOutboundProxyUrl;

window.onload = function () {
  txtPrivateIdentity = document.getElementById("txtPrivateIdentity");
  txtPublicIdentity = document.getElementById("txtPublicIdentity");
  txtPassword = document.getElementById("txtPassword");
  txtRealm = document.getElementById("txtRealm");
  txtDisplayName = document.getElementById("txtDisplayName");
  txtWebsocketServerUrl = document.getElementById("txtWebsocketServerUrl");
  txtSIPOutboundProxyUrl = document.getElementById("txtSIPOutboundProxyUrl");
  txtPhoneNumber = document.getElementById("txtPhoneNumber");

  SIPml.init(postInit);
};

function postInit() {
  btnRegister.disabled = false;
  oConfigCall = {
    video_local: document.getElementById("video-local"),
    video_remote: document.getElementById("video-remote"),
    audio_remote: document.getElementById("audio-remote"),

    screencast_window_id: 0x00000000, // entire desktop
    bandwidth: { audio: undefined, video: undefined },
    video_size: {
      minWidth: undefined,
      minHeight: undefined,
      maxWidth: undefined,
      maxHeight: undefined,
    },
    events_listener: { events: "*", listener: onSipEventSession },
    sip_caps: [
      { name: "+g.oma.sip-im" },
      { name: "language", value: '"en,fr"' },
    ],
  };
}
function sipRegister() {
  console.log("txtDisplayName", txtDisplayName.value);
  console.log("txtPassword", txtPassword.value);
  console.log("txtPrivateIdentity", txtPrivateIdentity.value);
  console.log("txtPublicIdentity", txtPublicIdentity.value);
  console.log("txtRealm", txtRealm.value);
  console.log("txtSIPOutboundProxyUrl", txtSIPOutboundProxyUrl.value);
  console.log("txtWebsocketServerUrl", txtWebsocketServerUrl.value);
  btnRegister.disabled = true;
  oSipStack = new SIPml.Stack({
    // realm: 'conf.nitoville.com', // mandatory: domain name
    // impi: '641234567891', // mandatory: authorization name (IMS Private Identity)
    // impu: 'sip:641234567891@conf.nitoville.com', // mandatory: valid SIP Uri (IMS Public Identity)
    // password: 'mysecret', // optional
    // display_name: '641234567891', // optional
    // websocket_proxy_url: 'wss://conf.nitoville.com:7443', // optional
    // outbound_proxy_url: 'tls://conf.nitoville.com:7443', // optional

    realm: txtRealm.value ? txtRealm.value : "conf.nitoville.com", // mandatory: domain name
    impi: txtPrivateIdentity.value ? txtPrivateIdentity.value : "641234567890", // mandatory: authorization name (IMS Private Identity)
    impu: txtPublicIdentity.value
      ? txtPublicIdentity.value
      : "sip:641234567890@conf.nitoville.com", // mandatory: valid SIP Uri (IMS Public Identity)
    password: txtPassword.value ? txtPassword.value : "mysecret", // optional
    display_name: txtDisplayName.value ? txtDisplayName.value : "641234567890", // optional
    websocket_proxy_url: txtWebsocketServerUrl.value
      ? txtWebsocketServerUrl.value
      : "wss://conf.nitoville.com:7443", // optional
    outbound_proxy_url: txtSIPOutboundProxyUrl.value
      ? txtSIPOutboundProxyUrl.value
      : "tls://conf.nitoville.com:7443", // optional

    enable_rtcweb_breaker: false, // optional
    events_listener: { events: "*", listener: onSipEventStack }, // optional: '*' means all events
    sip_headers: [
      // optional
      { name: "User-Agent", value: "IM-client/OMA1.0 sipML5-v1.0.0.0" },
      { name: "Organization", value: "Doubango Telecom" },
    ],
  });

  oSipStack.start();
}

function sipUnRegister() {
  if (oSipStack) {
    oSipStack.stop(); // shutdown all sessions
    txtRegStatus.innerHTML = "";
  }
}

// Callback function for SIP Stacks
function onSipEventStack(e /*SIPml.Stack.Event*/) {
  tsk_utils_log_info("==stack event = " + e.type);
  switch (e.type) {
    case "started": {
      // catch exception for IE (DOM not ready)
      try {
        // LogIn (REGISTER) as soon as the stack finish starting

        oSipSessionRegister = this.newSession("register", {
          expires: 200,
          events_listener: { events: "*", listener: onSipEventSession },
          sip_caps: [
            { name: "+g.oma.sip-im", value: null },
            //{ name: '+sip.ice' }, // rfc5768: FIXME doesn't work with Polycom TelePresence
            { name: "+audio", value: null },
            { name: "language", value: '"en,fr"' },
          ],
        });
        oSipSessionRegister.register();
      } catch (e) {
        txtRegStatus.value = txtRegStatus.innerHTML = "<b>1:" + e + "</b>";
        btnRegister.disabled = false;
      }
      break;
    }
    case "stopping":
    case "stopped":
    case "failed_to_start":
    case "failed_to_stop": {
      var bFailure = e.type == "failed_to_start" || e.type == "failed_to_stop";
      oSipStack = null;
      oSipSessionRegister = null;
      oSipSessionCall = null;

      uiOnConnectionEvent(false, false);

      txtCallStatus.innerHTML = "";
      txtRegStatus.innerHTML = bFailure
        ? "<i>Disconnected: <b>" + e.description + "</b></i>"
        : "<i>Disconnected</i>";
      break;
    }
    case "i_new_call": {
        if (oSipSessionCall) {
          // do not accept the incoming call if we're already 'in call'
          e.newSession.hangup(); // comment this line for multi-line support
        } else {
          oSipSessionCall = e.newSession;
          // start listening for events
          oSipSessionCall.setConfiguration(oConfigCall);

          var sRemoteNumber =
            oSipSessionCall.getRemoteFriendlyName() || "unknown";
          // txtCallStatus.innerHTML = "<i>Incoming call from [<b>" + sRemoteNumber + "</b>]</i>";
          txtCallStatus.innerHTML = `<i>Incoming call from <b>${sRemoteNumber} </b></i>
                      <button onClick="answercall()" class="btn btn-success">Answer</button>
                       <button onClick="rejectcall()"  class="btn btn-danger">Reject</button>
                      `;
        }
      break;
    }
    case "m_permission_requested":

    case "m_permission_accepted":
    case "m_permission_refused":

    default:
      break;
  }
}

answercall = () => {
  console.log("answering call");
  if (oSipSessionCall) {
    txtCallStatus.innerHTML = "<i>Connecting...</i>";
    oSipSessionCall.accept(oConfigCall);
  }
};
rejectcall = () => {
  console.log("reject call");

  oSipSessionCall.reject(oConfigCall);
};
function uiOnConnectionEvent(b_connected, b_connecting) {
  // should be enum: connecting, connected, terminating, terminated
  btnRegister.disabled = b_connected || b_connecting;
  btnUnRegister.disabled = !b_connected && !b_connecting;
  btnCall.disabled = !(
    b_connected &&
    tsk_utils_have_webrtc() &&
    tsk_utils_have_stream()
  );
  btnHangUp.disabled = !oSipSessionCall;
}

// makes a call (SIP INVITE)
function sipCall(s_type) {
  if (
    oSipStack &&
    !oSipSessionCall &&
    !tsk_string_is_null_or_empty(txtPhoneNumber.value)
  ) {
    btnCall.disabled = true;
    btnHangUp.disabled = false;

    // create call session
    oSipSessionCall = oSipStack.newSession(s_type, oConfigCall);
    // make call
    if (oSipSessionCall.call(txtPhoneNumber.value) != 0) {
      oSipSessionCall = null;
      txtCallStatus.value = "Failed to make call";
      btnCall.disabled = false;
      btnHangUp.disabled = true;
      return;
    }
  } else if (oSipSessionCall) {
    txtCallStatus.innerHTML = "<i>Connecting...</i>";
    oSipSessionCall.accept(oConfigCall);
  }
}
function sipHangUp() {
  if (oSipSessionCall) {
    txtCallStatus.innerHTML = "<i>Terminating the call...</i>";
    btnCall.disabled = false;
    oSipSessionCall.hangup({
      events_listener: { events: "*", listener: onSipEventSession },
    });
  }
}

var onSipEventSession = function (e) {
  tsk_utils_log_info("==session event = " + e.type);

  switch (e.type) {
    case "connecting":
    case "connected": {
      var bConnected = e.type == "connected";
      if (e.session == oSipSessionRegister) {
        uiOnConnectionEvent(bConnected, !bConnected);
        txtRegStatus.innerHTML = "<i>" + e.description + "</i>";
      } else if (e.session == oSipSessionCall) {
        btnHangUp.value = "HangUp";
        btnCall.disabled = true;
        btnHangUp.disabled = false;
        //  btnTransfer.disabled = false;

        (video_local = document.getElementById("video-local")),
          (video_remote = document.getElementById("video-remote")),
          (audio_remote = document.getElementById("audio-remote")),
          (txtCallStatus.innerHTML = "<i>" + e.description + "</i>");
      }
      break;
    }
    case "terminating":
    case "terminated": {
      if (e.session == oSipSessionRegister) {
        uiOnConnectionEvent(false, false);

        oSipSessionCall = null;
        oSipSessionRegister = null;

        txtRegStatus.innerHTML = "<i>" + e.description + "</i>";
      } else if (e.session == oSipSessionCall) {
        uiCallTerminated(e.description);
      }
      break;
    } // 'terminating' | 'terminated'
    case "m_stream_video_local_added":

    case "m_stream_video_local_removed":

    case "m_stream_video_remote_added":
        {
            if (e.session == oSipSessionCall) {
          console.log("remote video started now")
              }
            break;
        }

    case "m_stream_video_remote_removed":

    case "m_stream_audio_local_added":
    case "m_stream_audio_local_removed":
    case "m_stream_audio_remote_added":
    case "m_stream_audio_remote_removed":
    case "i_ect_new_call":

    case "i_ao_request": {
      if (e.session == oSipSessionCall) {
        var iSipResponseCode = e.getSipResponseCode();
        if (iSipResponseCode == 180 || iSipResponseCode == 183) {
          txtCallStatus.innerHTML = "<i>Remote ringing...</i>";
        }
      }
      break;
    }

    case "m_early_media":
    case "o_ect_accepted": {
      if (e.session == oSipSessionCall) {
        txtCallStatus.innerHTML = "<i>Call transfer accepted</i>";
      }
      break;
    }
    case "o_ect_completed":
    case "i_ect_completed":
        case 'o_ect_failed':
            case 'i_ect_failed':
                
                case 'o_ect_notify':
                case 'i_ect_notify':
                    
                case 'i_ect_requested':
  }
};

function uiCallTerminated(s_description) {
  // btnHangUp.value = 'HangUp';
  // btnHoldResume.value = 'hold';
  // btnMute.value = "Mute";
  btnCall.disabled = false;
  btnHangUp.disabled = true;

  oSipSessionCall = null;

  txtCallStatus.innerHTML = "<i>" + s_description + "</i>";

  setTimeout(function () {
    if (!oSipSessionCall) txtCallStatus.innerHTML = "";
  }, 2500);
}
