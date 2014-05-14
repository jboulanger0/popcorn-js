(function( Popcorn, window, document ) {



  var EMPTY_STRING            = "",

  // variables for Dailymotion API
      dmCallbacks = [],
      dmReady     = false,
      dmLoaded    = false;


  function isDailymotionReady(){
    if(!dmLoaded){
      window.dmAsyncInit = function(){
          dmReady = true;
          while(dmCallbacks.length){
            callback = dmCallbacks.shift();
            callback();
          }
      }
      var e = document.createElement('script');
      e.async = true;
      e.src = document.location.protocol + '//api.dmcdn.net/all.js';
      var s = document.getElementsByTagName('script')[0];
      s.parentNode.insertBefore(e, s);
      dmLoaded = true;
    }
    return dmReady;
  }

  function addDailymotionCallback(callback ){
    dmCallbacks.unshift( callback );
  }

  function HTMLDailymotionVideoElement( id ) {

    // Dailymotion iframe API requires postMessage
    if( !window.postMessage ) {
      throw new Error("ERROR: HTMLDailymotionVideoElement requires window.postMessage");
    }

    var self = this,
      parent = typeof id === "string" ? Popcorn.dom.find( id ) : id,
      elem = document.createElement( "div" ),
      impl = {
        src: EMPTY_STRING,
        preload: EMPTY_STRING,
        controls: false,
        loop: false,
        poster: EMPTY_STRING,

        readyState: self.HAVE_NOTHING,
        networkState: self.NETWORK_EMPTY,

        autoplay: EMPTY_STRING,
        currentTime: 0,
        //bufferedTime: 0,
        duration: NaN,
        seeking: false,
        error: null,
        ended: false,
        muted: false,
        volume: 1,
        paused: true
      },
      mediaReady = false,
      player,
      mediaReadyCallbacks = []

    // Namespace all events we'll produce
    self._eventNamespace = Popcorn.guid( "HTMLDailymotionVideoElement::" );

    self.parentNode = parent;

    // Mark type as Vimeo
    self._util.type = "Dailymotion";

    function addMediaReadyCallback( callback ) {
      mediaReadyCallbacks.unshift( callback );
    }

    function destroyPlayer() {
      if( !( mediaReady && player ) ) {
        return;
      }
      player.pause();
      parent.removeChild( elem );
      elem = document.createElement( "div" );
    }

    function onApiReady (e) {
      impl.networkState = self.NETWORK_LOADING;
      self.dispatchEvent("loadstart");
      mediaReady = true;
      while( mediaReadyCallbacks.length ) {
        mediaReadyCallbacks[0]();
        mediaReadyCallbacks.shift();
      }

    }


    function onProgress(e) {
      impl.networkState = self.NETWORK_LOADING;
      self.dispatchEvent("progress");

    }

    function onError(e) {
      var err = { name: "MediaError" };
      err.code = player.error.code;
      err.message = player.error.messsage;
      impl.error = err;
      self.dispatchEvent("error");

    }

    function onLoadedMetadata(e){
      impl.networkState = self.NETWORK_IDLE;
      impl.readyState = self.HAVE_METADATA;
      self.dispatchEvent( "loadedmetadata" );

    }

    function onPlaying(e) {
      impl.readyState = self.HAVE_FUTURE_DATA;
      impl.paused = false;
      impl.seeking = false;
      self.dispatchEvent( "playing" );
    }

    function onCanPlay(e) {
      impl.readyState = self.HAVE_FUTURE_DATA;
      self.dispatchEvent( "canplay" );
    }

    function onCanPlayThrough(e) {
      impl.readyState = self.HAVE_ENOUGH_DATA;
      self.dispatchEvent( "canplaythrough" );
    }

    function onSeeking(e) {
      impl.seeking = true;
      self.dispatchEvent("seeking");
    }

    function onSeeked(e) {
      impl.seeking = false;
      self.dispatchEvent("seeked");
    }

    function onTimeUpdate(e) {
      impl.currentTime = player.currentTime

      self.dispatchEvent("timeupdate");
    }

    function onEnded(e) {
      if( impl.loop ) {
        changeCurrentTime( 0 );
        self.play();
      } else {
        impl.ended = true;
        self.dispatchEvent( "ended" );
      }
    }

    function onDurationChange(e) {
      var oldDuration = impl.duration;
      var newDuration = player.duration;

      if( oldDuration !== newDuration ) {
        impl.duration = newDuration;
        self.dispatchEvent( "durationchange" );
        if(isNaN(oldDuration)){
          impl.readyState = self.HAVE_CURRENT_DATA;
          self.dispatchEvent( "loadeddata" );
        }
      }
    }

    function onPlay(e) {
      if( impl.ended ) {
        changeCurrentTime( 0 );
        impl.ended = false;
      }
      impl.paused = false;
      self.dispatchEvent( "play" );
    }

    function onPause(e) {
      impl.paused = true;
      self.dispatchEvent( "pause" );
    }

    function onVolumeChange(e) {
      impl.muted = player.muted;
      impl.volume = player.volume;
      self.dispatchEvent( "volumechange" );
    }

    self.play = function() {
      if( !mediaReady ) {
        addMediaReadyCallback( function() { self.play(); } );
        return;
      }
      player.play();
    };

    self.pause = function() {
      if( !mediaReady ) {
        addMediaReadyCallback( function() { self.pause(); } );
        return;
      }

      player.pause();
    };

    function changeSrc( aSrc ) {
      if(!self._canPlaySrc(aSrc)){
        impl.error = {
          name: "MediaError",
          message: "Media Source Not Supported",
          code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        };
        self.dispatchEvent( "error" );
        return
      }
      impl.src = aSrc;
      if(mediaReady){
        destroyPlayer();
      }

      // Make sure Dailymotion is ready, and if not, register a callback
      if(!isDailymotionReady()){
        addDailymotionCallback(
          function(){
            changeSrc(aSrc);
          }
        );
        return;
      }

      mediaReady = false;
      parent.appendChild( elem );
      var src      = self._util.parseUri( aSrc ),
          queryKey = src.queryKey,
          playerVars = {},
          video_id


      // Reinit all value in impl
      // Start the playback of the video automatically after the player load (may be restricted, defaults to 0).
      playerVars.autoplay  = queryKey.autoplay  || (impl.autoplay ? 1 : 0);

      // Don't show related videos when ending
      playerVars.api = queryKey.api || "postMessage";

      // Don't show video info before playing
      playerVars.chromeless = queryKey.chromeless || 1;

      // Show videos info (title/author) on the start screen.
      playerVars.info = queryKey.info || 0;

      // Allows to hide or show the Dailymotion logo.
      playerVars.logo = queryKey.logo || 1;

      if(queryKey.syndication){
        playerVars.syndication = queryKey.syndication;
      }


      // Show related videos at the end of the video.
      playerVars.related = queryKey.related || 0;
      var match = src.source.match(/dailymotion\.com\/embed\/?video\/([a-z0-9\-]+)_*/i);
      var video_id = match ? match[1] : src.path;
      player = DM.player(elem, {video: video_id, width: "100%", height: "100%", params: playerVars});
      //AddListener
      player.addEventListener("apiready", onApiReady);
      player.addEventListener("progress",       onProgress);
      player.addEventListener("error",          onError);
      player.addEventListener("playing",        onPlaying);
      player.addEventListener("canplay",        onCanPlay);
      player.addEventListener("canplaythrough", onCanPlayThrough);
      player.addEventListener("seeking",        onSeeking);
      player.addEventListener("seeked",         onSeeked);
      player.addEventListener("timeupdate",     onTimeUpdate);
      player.addEventListener("ended",          onEnded);
      player.addEventListener("durationchange", onDurationChange);
      player.addEventListener("play",           onPlay);
      player.addEventListener("pause",          onPause);
      player.addEventListener("volumechange",   onVolumeChange);
      player.addEventListener("loadedmetadata",   onLoadedMetadata);

    }

    function changeCurrentTime(aTime){
      if( !mediaReady ) {
        addMediaReadyCallback( function() {
          player.seek(aTime);
        });
        return;
      }
      player.seek(aTime);
    }

    function setVolume( aValue ) {
      player.setVolume(aValue);
    }

    function setMuted( aMute ) {
      if( !mediaReady ) {
        addMediaReadyCallback( function() {
          player.setMuted( aMute );
        });
        return;
      }
    }

    Object.defineProperties( self, {

      src: {
        get: function() {
          return impl.src;
        },
        set: function( aSrc ) {
          if( aSrc && aSrc !== impl.src ) {
            changeSrc( aSrc );
          }
        }
      },

      autoplay: {
        get: function() {
          return impl.autoplay;
        },
        set: function( aValue ) {
          impl.autoplay = self._util.isAttributeSet( aValue );
        }
      },

      loop: {
        get: function() {
          return impl.loop;
        },
        set: function( aValue ) {
          impl.loop = self._util.isAttributeSet( aValue );
        }
      },

      width: {
        get: function() {
          return self.parentNode.offsetWidth;
        }
      },

      height: {
        get: function() {
          return self.parentNode.offsetHeight;
        }
      },

      currentTime: {
        get: function() {
          return impl.currentTime;
        },
        set: function( aValue ) {
          changeCurrentTime( aValue );
        }
      },

      duration: {
        get: function() {
          return impl.duration;
        }
      },

      ended: {
        get: function() {
          return impl.ended;
        }
      },

      paused: {
        get: function() {
          return impl.paused;
        }
      },

      seeking: {
        get: function() {
          return impl.seeking;
        }
      },

      readyState: {
        get: function() {
          return impl.readyState;
        }
      },

      networkState: {
        get: function() {
          return impl.networkState;
        }
      },

      volume: {
        get: function() {
          return impl.volume;
        },
        set: function( aValue ) {
          if( aValue < 0 || aValue > 1 ) {
            throw new Error("Volume value must be between 0.0 and 1.0");
          }
          setVolume( aValue );
        }
      },

      muted: {
        get: function() {
          return getMuted();
        },
        set: function( aValue ) {
          setMuted( self._util.isAttributeSet( aValue ) );
        }
      },

      error: {
        get: function() {
          return impl.error;
        }
      }//,
      // MISSING buffered property
      // buffered: {
      //   get: function () {
      //     var timeRanges = {
      //       start: function( index ) {
      //         if ( index === 0 ) {
      //           return 0;
      //         }

      //         //throw fake DOMException/INDEX_SIZE_ERR
      //         throw new Error("INDEX_SIZE_ERR: DOM Exception 1");
      //       },
      //       end: function( index ) {
      //         var duration;
      //         if ( index === 0 ) {
      //           duration = getDuration();
      //           if ( !duration ) {
      //             return 0;
      //           }

      //           return duration * player.getVideoLoadedFraction();
      //         }

      //         //throw fake DOMException/INDEX_SIZE_ERR
      //         throw new Error("INDEX_SIZE_ERR: DOM Exception 1");
      //       }
      //     };

      //     Object.defineProperties( timeRanges, {
      //       length: {
      //         get: function() {
      //           return 1;
      //         }
      //       }
      //     });

      //     return timeRanges;
      //   }
      // }
    });
  }

  HTMLDailymotionVideoElement.prototype = new Popcorn._MediaElementProto();
  HTMLDailymotionVideoElement.prototype.constructor = HTMLDailymotionVideoElement;

  // Helper for identifying URLs we know how to play.
  HTMLDailymotionVideoElement.prototype._canPlaySrc = function( url ) {
    return (/dailymotion\.com\/embed\/video\//).test( url ) ? "probably" : EMPTY_STRING;
  };

  // We'll attempt to support a mime type of video/x-vimeo
  HTMLDailymotionVideoElement.prototype.canPlayType = function( type ) {
    return type === "video/x-dailymotion" ? "probably" : EMPTY_STRING;
  };

  Popcorn.HTMLDailymotionVideoElement = function( id ) {
    return new HTMLDailymotionVideoElement( id );
  };
  Popcorn.HTMLDailymotionVideoElement._canPlaySrc = HTMLDailymotionVideoElement.prototype._canPlaySrc;
  Popcorn.HTMLDailymotionVideoElement.canPlayType = HTMLDailymotionVideoElement.prototype.canPlayType;

}( Popcorn, window, document ));
