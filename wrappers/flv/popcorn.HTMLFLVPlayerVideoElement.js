
// PLAYER URL
// 

(function( Popcorn, window, document ) {

  var EMPTY_STRING = "",
      SWF_URL = "https://bo-static.omnitagjs.com/bo-static/swf/player.swf"

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
      mediaReady = false,
      loopedPlay = false,
      player,
      mediaReadyCallbacks = [],
      lastLoadedFraction = 0,

    // Namespace all events we'll produce
    self._eventNamespace = Popcorn.guid( "HTMLFLVPlayerVideoElement::" );

    self.parentNode = parent;

    // Mark this as FLVPlayer
    self._util.type = "FLVPlayer";

    function addMediaReadyCallback( callback ) {
      mediaReadyCallbacks.unshift( callback );
    }

    function onReady() {
      
    }

    function onPauseEvent() {
      
    }
    function onPlayEvent() {
     
    }

    function onSeekEvent() {
    
    }

    function onPlayerReady() {

    }

    function getDuration() {
      return player.getDuration();
    }

    function onPlayerError( e ) {
      var err = { name: "MediaError" };
      err.message = e.message;
      err.code = e.code || 5;

      impl.error = err;
      self.dispatchEvent( "error" );
    }

    function destroyPlayer() {
      // remove embed player
      //player.destroy();
      player.pause();
      parent.removeChild( elem );
      elem = document.createElement( "div" );
    }

    function createPlayer(playerVars){
      //integrate EMBED
      var param = document.createElement('param');
          
      elem.setAttribute('width', "100%");
      elem.setAttribute('height', "100%");
      elem.setAttribute('data', SWF_URL);

      param.setAttribute('name', 'movie');
      param.setAttribute('value', SWF_URL);
      elem.appendChild(param);

      param.setAttribute('name', 'allowFullScreen');
      param.setAttribute('value', "true");
      elem.appendChild(param);

      param.setAttribute('name', 'AllowScriptAccess');
      param.setAttribute('value', "always");
      elem.appendChild(param);
      
      param.setAttribute('name', 'bgcolor');
      param.setAttribute('value', "#000000");
      elem.appendChild(param);
      
      param.setAttribute('name', 'FlashVars');
      param.setAttribute('value', playerVars); // stringify playerVars
      elem.appendChild(param);
      
      var embed = document.createElement('embed');
          embed.setAttribute('src', SWF_URL);
          embed.setAttribute('type', 'application/x-shockwave-flash');
          embed.setAttribute('allowfullscreen', "true");
          embed.setAttribute('allowScriptAccess',"always");
          embed.setAttribute('wmode', "opaque");
          embed.setAttribute('width', "100%");
          embed.setAttribute('height', "100%");
          embed.setAttribute('FlashVars', playerVars); // stringify playerVars

      elem.appendChild(embed)
      self.parentNode.appendChild(elem)
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
      // Use any player vars passed on the URL
      var playerVars = "interval=" +self._util.TIMEUPDATE_MS + "&bgcolor=000000&listener=ayl_video_listener";

      //implement player ready add changeSRC to player callback

      impl.src = aSrc;

      if ( !playerReady ) {
        createPlayer(playerVars);
      }

      impl.networkState = self.NETWORK_LOADING;
      self.dispatchEvent( "loadstart" );
      self.dispatchEvent( "progress" );
    }

    function getCurrentTime() {
      return impl.currentTime;
    }

    function changeCurrentTime( aTime ) {
      impl.currentTime = aTime;
      if ( !mediaReady ) {
        addMediaReadyCallback( function() {
          onSeeking();
          player.seek( aTime );
        });
        return;
      }

      onSeeking();
      player.seek( aTime );
    }

    function onSeeking() {
      impl.seeking = true;
      self.dispatchEvent( "seeking" );
    }

    function onSeeked() {
      impl.ended = false;
      impl.seeking = false;
      self.dispatchEvent( "timeupdate" );
      self.dispatchEvent( "seeked" );
      self.dispatchEvent( "canplay" );
      self.dispatchEvent( "canplaythrough" );
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

    self.play = function() {
      self.dispatchEvent( "play" );
      impl.paused = false;
      if ( !mediaReady ) {
        addMediaReadyCallback( function() { self.play(); } );
        return;
      }
      if ( impl.ended ) {
        changeCurrentTime( 0 );
        impl.ended = false;
      }
      player.play( true );
    };

    function onPause() {
      impl.paused = true;
      if ( !playerPaused ) {
        playerPaused = true;
        self.dispatchEvent( "pause" );
      }
    }

    self.pause = function() {
      impl.paused = true;
      if ( !mediaReady ) {
        addMediaReadyCallback( function() { self.pause(); } );
        return;
      }
      player.pause( true );
    };

    function onEnded() {
      if ( impl.loop ) {
        changeCurrentTime( 0 );
      } else {
        impl.ended = true;
        onPause();
        self.dispatchEvent( "timeupdate" );
        self.dispatchEvent( "ended" );
      }
    }

    function setVolume( aValue ) {
      impl.volume = aValue;
      if ( !mediaReady ) {
        addMediaReadyCallback( function() {
          setVolume( impl.volume );
        });
        return;
      }
      player.setVolume( impl.volume * 100 );
      self.dispatchEvent( "volumechange" );
    }

    function setMuted( aValue ) {
      impl.muted = aValue;
      if ( !mediaReady ) {
        addMediaReadyCallback( function() { setMuted( impl.muted ); } );
        return;
      }
      player.setMute( aValue );
      self.dispatchEvent( "volumechange" );
    }

    function getMuted() {
      return impl.muted;
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

                return duration * ( player.getBuffer() / 100 );
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
    // Because of the nature of JWPlayer playing all media types,
    // it can potentially play all url formats.
    return "probably";
  };

  // This could potentially support everything. It is a bit of a catch all player.
  Popcorn.HTMLFLVPlayerVideoElement.canPlayType = function( type ) {
    return "probably";
  };

}( Popcorn, window, document ));
