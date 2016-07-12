//load variables from local storage, query string, or defaults

/**
 * The Instagrame username to fetch content from
 */
var igUsername = localStorage.getItem('igUsername') || 
                 gup('igUsername') || 
                 'instagram';
/**
 * The location of the Spacebrew server to expose controls through
 */
var sbServer = localStorage.getItem('sbServer') ||
               gup('sbServer') || 
               'ws://localhost:9090/';
/**
 * A flag to let us know whether this is running on an Openframe
 *  or just on some computer
 */
var isOpenframe = gup('isOpenframe') || false;
/**
 * An optional proxy to forward requests through
 */
var proxy = gup('proxy') || false;
/**
 * Tracks which post we are showing
 */
var currentIndex = 0;

//if a proxy is defined, override XMLHttpRequest to always use proxy
if (proxy){
  overrideXHR(proxy);
}

// fetch the latest posts from the specified user
httpGetJsonAsync('https://www.instagram.com/'+igUsername+'/media/', processIG);

// templates for video and image display
var templates = {
  'video':'<div class="slide video"><div><video preload="preload" loop="loop" muted="muted"><source src="{{src}}" type="video/mp4"></source></video></div></div>',
  'image':'<div class="slide image" style="background-image:url({{src}});"></div>'
};

/**
 * Overrides XMLHttpRequest so it uses the provided proxy.
 *  the format used assumes the proxy is 
 *  [cors-anywhere](https://npmjs.org/packages/cors-anywhere)
 * @param proxy {string} the proxy to use for all requests
 */
function overrideXHR(proxy){
  var cors_api_host = proxy;
  var cors_api_url = 'https://' + cors_api_host + '/';
  var slice = [].slice;
  var origin = window.location.protocol + '//' + window.location.host;
  var open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function() {
    var args = slice.call(arguments);
    var targetOrigin = /^https?:\/\/([^\/]+)/i.exec(args[1]);
    if (targetOrigin && targetOrigin[0].toLowerCase() !== origin &&
      targetOrigin[1] !== cors_api_host) {
      args[1] = cors_api_url + args[1];
    }
    return open.apply(this, args);
  };
}

/**
 * Returns the value for the requested user parameter/query string key
 */
function gup( name )
{
  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+name+"=([^&#]*)";
  var regex = new RegExp( regexS );
  var results = regex.exec( window.location.href );
  if( results == null )
    return "";
  else
    return results[1];
}

/**
 * retrieve JSON. modifies the document body an error.
 * @param url {string} the endpoint to request JSON from
 * @param callback {function} a callback to pass the parsed JSON response to
 */
function httpGetJsonAsync(url, callback){
    var xhttp = new XMLHttpRequest();
    xhttp.open('GET', url, true);
    xhttp.onreadystatechange = function(){
      if (xhttp.readyState === 4 && xhttp.status === 200){
        callback(JSON.parse(xhttp.responseText));
      }
    };
    xhttp.onerror = function(){
      document.body.innerText = "failed HTTP request";
    };
    xhttp.send();
} 

/**
 * loads the returned Instagram data into the DOM.
 * @param data {hashmap} JSON returned from the Instagram API
 */
function processIG(data){
  for (item of data.items){
    var src;
    if (item.type === 'video'){
      src = item.alt_media_url;
    } else if (item.type === 'image'){
      src = item.link+'media/?size=l';
    }

    var tElem = document.createElement('template');
    tElem.innerHTML = templates[item.type].
                        replace('{{src}}', src);
    document.body.appendChild(tElem.content.firstChild);
  }
  //set a timeout for starting the slideshow 
  // to give the DOM time to update
  setTimeout(startSlideshow, 0);
}

function startSlideshow(){
  //if we have not yet started showing content
  // then start it!
  if (document.getElementsByClassName('visible').length === 0){
    currentIndex = 0;
    showPost(currentIndex);
  }
}

/**
 * Shows the specified post
 * @param index {number} the post index to make visible
 */
function showPost(index){
  var post = document.body.children[index];
  if (post){
    //make the post visible
    post.classList.remove('hide');
    post.classList.add('visible');
    // if it is an image, change in a set amount of time
    if (post.classList.contains('image')){
      setTimeout(switchPosts, 10000);
    }
    //if it is a video, start playing
    else if (post.classList.contains('video')){
      var video = post.getElementsByTagName('video')[0];
      video.loop = true;
      video.currentTime = 0;
      video.play();
      //and let it play/loop for at least 9 seconds
      setTimeout(checkVideoEnd.bind(this, video), 9000);
    }
  }
}

/**
 * set up the callback to handle when the video ends
 * @param video {video} the video to attach the listener to
 */
function checkVideoEnd(video){
  video.addEventListener('ended', videoEnded);
  video.loop = false;
}

/**
 * Switch posts once the currently playing video ends
 * @param evt {Event} the ended event
 */
function videoEnded(evt){
  var video = evt.target;
  video.pause();
  video.removeEventListener('ended', videoEnded);
  switchPosts();
}

/**
 * Hides the specified post
 * @param index {number} the post index to hide
 */
function hidePost(index){
  var post = document.body.children[index];
  if (post){
    //hide the post
    post.classList.remove('visible');
    post.classList.add('hide');
  }
}

/**
 * switches the currently visible post
 */
function switchPosts(){
  hidePost(currentIndex);
  currentIndex = ((currentIndex + 1) % document.body.children.length);
  showPost(currentIndex);
}
