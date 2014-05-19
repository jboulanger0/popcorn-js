
// PLAYER URL
//

(function( Popcorn, window, document ) {

  var EMPTY_STRING = "",
      CURRENT_TIME_MONITOR_MS = 10,
      SWF_URL = "/player.swf",
      ABS = Math.abs;

  function HTMLFLVPlayerVideoElement( id ) {
    var self = new Popcorn._MediaElementProto(),
      parent = typeof id === "string" ? document.querySelector( id ) : id,
      elem = document.createElement('object'),
      impl = {
        src: EMPTY_STRING,
        networkState: self.NETWORK_EMPTY,
        readyState: self.HAVE_NOTHING,
        seeking: false,
        autoplay: EMPTY_STRING,
        preload: EMPTY_STRING,
        controls: false,
        loop: false,
        poster: EMPTY_STRING,
        volume: 1,
        muted: false,
        currentTime: 0,
        duration: NaN,
        ended: false,
        paused: true,
        error: null
      },
      playerUID = Popcorn.guid(),
      playerReady = false,
      playerPaused = true,
      mediaReady = false,
      loopedPlay = false,
      player,
      mediaReadyCallbacks = [],
      lastLoadedFraction = 0,
      lastVolume = -1,
      bufferedInterval,
      currentTimeInterval;

    // Namespace all events we'll produce
    self._eventNamespace = Popcorn.guid( "HTMLFLVPlayerVideoElement::" );

    self.parentNode = parent;

    // Mark this as FLVPlayer
    self._util.type = "FLVPlayer";

    function destroyPlayer() {
      if( !( playerReady && player ) ) {
        return;
      }
      clearInterval( currentTimeInterval );
      clearInterval( bufferedInterval );
      self.pause()
      parent.removeChild( elem );
      elem = document.createElement( "embed" );
    }



    function monitorCurrentTime() {
      var playerTime = parseInt(listener().position, 10);
      if ( !impl.seeking ) {
        impl.currentTime = playerTime;
        if ( ABS( impl.currentTime - playerTime ) > CURRENT_TIME_MONITOR_MS ) {
          onSeeking();
          onSeeked();
        }
      } else if ( ABS( playerTime - impl.currentTime ) < 1 ) {
        onSeeked();
      }
    }

    function monitorBuffered() {
      var fraction = parseInt(listener().bytesLoaded, 10);

      if ( lastLoadedFraction !== fraction ) {
        lastLoadedFraction = fraction;

        onProgress();

        if ( fraction >= 1 ) {
          clearInterval( bufferedInterval );
        }
      }
    }


    function addMediaReadyCallback( callback ) {
      mediaReadyCallbacks.unshift( callback );
    }

    window["flvplayer_listener_"+playerUID] = {
        onClick:     function(){

        },
        onKeyUp:     function(){

        },
        onFlashInit: function(){},
        onInit:      function(){
            playerReady = true
            player = document.getElementById(playerUID)
            player.SetVariable("method:setUrl", impl.src)
        },
        onFinished:  function(){
          onEnded()
        },
        onUpdate:    function(){
          if(playerReady){
            onUpdate()
          }

        }
    }
    function listener(){
      return window["flvplayer_listener_"+playerUID]
    }

    function onUpdate(){
      if (listener().isPlaying == "true") {
        if(playerPaused){
          playerPaused = false
        }
        if (parseInt(listener().position, 10) > 0) {
          onTimeUpdate()
        } else {
          onBuffering()
        }
      }else{

        if ( getDuration() > 0) {
          if(!playerPaused){
            onPause()
          }
        } else {
          if(!mediaReady){
            onReady()
          }
        }
      }
    }

    function onReady() {
      bufferedInterval = setInterval( monitorBuffered, 50 );
      impl.duration = parseInt(listener.duration, 10);
      impl.readyState = self.HAVE_METADATA;
      self.dispatchEvent( "loadedmetadata" );
      currentTimeInterval = setInterval( monitorCurrentTime, CURRENT_TIME_MONITOR_MS );
      self.dispatchEvent( "loadeddata" );

      impl.readyState = self.HAVE_FUTURE_DATA;
      self.dispatchEvent( "canplay" );
      mediaReady = true
      var i = mediaReadyCallbacks.length;
      while( i-- ) {
        mediaReadyCallbacks[ i ]();
        delete mediaReadyCallbacks[ i ];
      }
      impl.readyState = self.HAVE_ENOUGH_DATA;
      self.dispatchEvent( "canplaythrough" );
    }

    function onPlayerError( e ) {
      var err = { name: "MediaError" };
      err.message = e.message;
      err.code = e.code || 5;

      impl.error = err;
      self.dispatchEvent( "error" );
    }


    function onSeeking() {
      impl.seeking = true;
      self.dispatchEvent( "seeking" );
    }

    function onSeeked() {
      impl.ended = false;
      impl.seeking = false;
      self.dispatchEvent( "seeked" );
    }

    function onPlay() {
      impl.paused = false;

      if ( playerPaused ) {
        playerPaused = false;

        // Only 1 play when video.loop=true
        if ( ( impl.loop && !loopedPlay ) || !impl.loop ) {
          loopedPlay = true;
          self.dispatchEvent( "play" );
        }
        self.dispatchEvent( "playing" );
      }
    }

    function onProgress() {
      self.dispatchEvent( "progress" );
    }


    function onPause() {
      impl.paused = true;
      if ( !playerPaused ) {
        playerPaused = true;
        self.dispatchEvent( "pause" );
      }
    }

    function onEnded() {
      if ( impl.loop ) {
        changeCurrentTime( 0 );
        self.play();
      } else {
        impl.ended = true;
        onPause();
        self.dispatchEvent( "ended" );
      }
    }

    function onTimeUpdate() {
      self.dispatchEvent( "timeupdate" );
    }

    function onBuffering() {
      impl.networkState = self.NETWORK_LOADING;
      self.dispatchEvent( "waiting" );
    }

    self.play = function() {
      if ( !mediaReady ) {
        addMediaReadyCallback( function() { self.play(); } );
        return;
      }
      impl.paused = false;
      if ( impl.ended ) {
        changeCurrentTime( 0 );
        impl.ended = false;
      }

      player.SetVariable("method:play", "")
      self.dispatchEvent( "play" );
    };



    self.pause = function() {
      if ( !mediaReady ) {
        addMediaReadyCallback( function() { self.pause(); } );
        return;
      }
      impl.paused = true;
      player.SetVariable("method:pause", "")
    };



    function getCurrentTime() {
      return impl.currentTime;
    }

    function changeCurrentTime( aTime ) {
      if ( !mediaReady ) {
        addMediaReadyCallback( function() {
          changeCurrentTime( aTime )
        });
        return;
      }
      impl.currentTime = aTime;
      onSeeking();
      player.SetVariable("method:position", aTime)
    }

    function changeSrc( aSrc ) {
      if ( !self._canPlaySrc( aSrc ) ) {
        impl.error = {
          name: "MediaError",
          message: "Media Source Not Supported",
          code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        };
        self.dispatchEvent( "error" );
        return;
      }
      mediaReady = false
      playerReady = false


      var playerVars = "interval=" + CURRENT_TIME_MONITOR_MS + "&bgcolor=000000&listener=flvplayer_listener_" + playerUID;

      impl.src = aSrc;
      if(!playerReady){
        elem.setAttribute('id', playerUID);
        elem.setAttribute('width', "100%");
        elem.setAttribute('height', "100%");
        elem.setAttribute('data', SWF_URL);
        var isIE = eval("/*@cc_on!@*/false;")
        if(isIE){
          elem.setAttribute('classid', "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000")
        }else{
          elem.setAttribute('type', "application/x-shockwave-flash")
        }

        var param = document.createElement('param');
        param.setAttribute('name', 'movie');
        param.setAttribute('value', SWF_URL);
        elem.appendChild(param);

        param = document.createElement('param');
        param.setAttribute('name', 'allowFullScreen');
        param.setAttribute('value', "true");
        elem.appendChild(param);

        param = document.createElement('param');
        param.setAttribute('name', 'AllowScriptAccess');
        param.setAttribute('value', "always");
        elem.appendChild(param);

        param = document.createElement('param');
        param.setAttribute('name', 'wmode');
        param.setAttribute('value', "opaque");
        elem.appendChild(param);


        param = document.createElement('param');
        param.setAttribute('name', 'bgcolor');
        param.setAttribute('value', "#000000");
        elem.appendChild(param);

        param = document.createElement('param');
        param.setAttribute('name', 'FlashVars');
        param.setAttribute('value', playerVars);
        elem.appendChild(param);

        var embed = document.createElement('embed');
            embed.setAttribute('src', SWF_URL);
            embed.setAttribute('type', 'application/x-shockwave-flash');
            embed.setAttribute('allowfullscreen', "true");
            embed.setAttribute('bgcolor', "#000000");
            embed.setAttribute('AllowScriptAccess',"always");
            embed.setAttribute('wmode', "opaque");
            embed.setAttribute('width', "100%");
            embed.setAttribute('height', "100%");
            embed.setAttribute('FlashVars', playerVars);
            embed.setAttribute('name', "embed_"+playerUID);

        elem.appendChild(embed)
        self.parentNode.appendChild(elem)

      }else{
        player.SetVariable("method:setUrl", impl.src)
      }
      impl.networkState = self.NETWORK_LOADING;
      self.dispatchEvent( "loadstart" );
      self.dispatchEvent( "progress" );
      if(impl.autoplay){
        self.play()
      }
    }




    function setVolume( aValue ) {
      if ( !mediaReady ) {
        addMediaReadyCallback( function() {
          setVolume( impl.volume );
        });
        return;
      }
      impl.volume = aValue;
      player.SetVariable("method:setVolume", impl.volume * 100)
      self.dispatchEvent( "volumechange" );
    }

    function setMuted( aValue ) {
      if ( !mediaReady ) {
        addMediaReadyCallback( function() { setMuted( aValue ); } );
        return;
      }

      impl.muted = aValue;
      if(impl.muted){
        lastVolume = impl.volume
        setVolume(0)
      }else if(lastVolume > -1){
        setVolume(lastVolume)
        lastVolume = -1
      }

    }

    function getMuted() {
      return impl.muted;
    }

    function getDuration() {
      return parseInt(listener().duration, 10);
    }

    Object.defineProperties( self, {

      src: {
        get: function() {
          return impl.src;
        },
        set: function( aSrc ) {
          if ( aSrc && aSrc !== impl.src ) {
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
          return getCurrentTime();
        },
        set: function( aValue ) {
          changeCurrentTime( aValue );
        }
      },

      duration: {
        get: function() {
          return getDuration();
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
          if ( aValue < 0 || aValue > 1 ) {
            throw "Volume value must be between 0.0 and 1.0";
          }

          setVolume( aValue );
        }
      },

      muted: {
        get: function() {
          return impl.muted;
        },
        set: function( aValue ) {
          setMuted( self._util.isAttributeSet( aValue ) );
        }
      },

      error: {
        get: function() {
          return impl.error;
        }
      },

      buffered: {
        get: function () {
          var timeRanges = {
            start: function( index ) {
              if ( index === 0 ) {
                return 0;
              }

              //throw fake DOMException/INDEX_SIZE_ERR
              throw "INDEX_SIZE_ERR: DOM Exception 1";
            },
            end: function( index ) {
              var duration;
              if ( index === 0 ) {
                duration = getDuration();
                if ( !duration ) {
                  return 0;
                }

                return duration * ( parseInt(listener().bytesLoaded, 10) / 100 );
              }

              //throw fake DOMException/INDEX_SIZE_ERR
              throw "INDEX_SIZE_ERR: DOM Exception 1";
            },
            length: 1
          };

          return timeRanges;
        }
      }
    });

    self._canPlaySrc = Popcorn.HTMLFLVPlayerVideoElement._canPlaySrc;
    self.canPlayType = Popcorn.HTMLFLVPlayerVideoElement.canPlayType;

    return self;
  }

  Popcorn.HTMLFLVPlayerVideoElement = function( id ) {
    return new HTMLFLVPlayerVideoElement( id );
  };

  // Helper for identifying URLs we know how to play.
  Popcorn.HTMLFLVPlayerVideoElement._canPlaySrc = function( url ) {
    return (/\.flv/).test( url ) ? "probably" : EMPTY_STRING;
  };

  Popcorn.HTMLFLVPlayerVideoElement.canPlayType = function( type ) {
    return type === "video/x-flv" || type === "video/flv" ? "probably" : EMPTY_STRING;
  };

}( Popcorn, window, document ));
