var $myjq, sorted=false, orig_fd;
function getScript(){
    var script=document.createElement('script');
    script.src='http://code.jquery.com/jquery-latest.min.js';
    var head=document.getElementsByTagName('head')[0],
    done=false;
    // Attach handlers for all browsers
    script.onload=script.onreadystatechange = function(){
        if ( !done && (!this.readyState
            || this.readyState == 'loaded'
            || this.readyState == 'complete') ) {
            done=true;
            $myjq=jQuery.noConflict();
            window.setTimeout(myfeedlysort,10);
            script.onload = script.onreadystatechange = null;
            head.removeChild(script);
        }
    };
    head.appendChild(script);
}
getScript();

function myfeedlysort(){
    //DEBUG : $myjq('.u0Entry').each(function(){console.log($myjq(this).find('.nbrRecommendations').attr('title'))})
    var tryCnt, maxTry, maxFetch, unreadCount, feedId, feedCnt;
    var monitorAdded = false;
    var ignoreUnread = false;
    
    function initVar(){
        tryCnt   = 0; 
        maxTry   = 10;  //Max attempts to load more feeds (scroll down) 
        maxFetch = 40; //Max feeds to load for sorting
        feedId   = $myjq('#feedlyTitleBar a').attr('id');
        feedCnt  = $myjq('.u0Entry').length;
        unreadCount = parseInt($myjq('[class$=UnreadCountHint]:first').text().replace(/[^\d]/g,'')) || 0 ;
        injectSortButton();  
        if (!monitorAdded){
            $myjq('#feedlyTabsHolder').delegate('','click',function(){setTimeout(checkForFeedChange,100);});
            monitorAdded = true;
        }
    }    
    function waitForFeedLoad(){
        if ($myjq('.u0Entry').length == 0){
            setTimeout(waitForFeedLoad,50);
        }
        else {
            initVar();
        }
    }
    function checkForFeedChange(){
        var tmpFeedId   = $myjq('#feedlyTitleBar a').attr('id');
        var tmpFeedCnt  = $myjq('.u0Entry').length;
        if ((tmpFeedId != feedId) || (tmpFeedCnt != feedCnt)){
            waitForFeedLoad();            
        }    
    }
    //Remove all posts beyond the clicked post
    function clickGo(){
        checkForFeedChange();
        checkAvailableFeed();
        $myjq(document).scrollTop(0);
        //window.scrollTo(0,0);    
    }
    function updateOptions(){
        maxFetch = parseInt($myjq('#mygo1').val()) || maxFetch;
        ignoreUnread = true; //manual update => unread count would be ignored
    }
    function injectSortButton(){
        if ($myjq('#myfeedlyid').length == 0 ){
            $myjq('#feedlyPageHeader .pageActionBar').prepend($myjq('<img id="myfeedlyid" src="http://i.imgur.com/3MksqRg.png?1" title="Sort By Likes" class="pageAction" id="mygo" style="opacity:1;width:24;height:24;border:0;display:inline;"/>').click(clickGo));
            $myjq('#feedlyPageHeader .pageActionBar').prepend($myjq('<input type="text" name="maxfetch" title="Max feeds to sort - ignored if less than feeds already loaded" class="pageAction" id="mygo1" style="opacity:1;width:40;height:24;float:left;display:inline;"/>').change(updateOptions));
        }
        maxFetch = ((unreadCount == 0)||(typeof unreadCount === 'undefined')||(ignoreUnread)) ? maxFetch : unreadCount;
        $myjq('#mygo1').val(maxFetch);        
    }
    function checkAvailableFeed(){
        var availableFeed = $myjq('.u0Entry').length;
        if ( (availableFeed >= unreadCount) || (availableFeed >= maxFetch) || (tryCnt >= maxTry) ){

        }
        else {
            tryCnt++;
            $myjq(document).scrollTop($myjq(document).scrollTop()+$myjq('#mainBar').height());
            //window.scrollTo(0,$myjq('#mainBar').height() + 100);
            setTimeout(checkAvailableFeed,500);
        }
    }
    function getInteractionCount(){
        var urlArray = [];
        $myjq('.u0Entry').each(function() {
            var articleUrl = $myjq(this).attr('data-alternate-link').replace(/.utm_source.*/,'');
            $myjq(this).attr('data-alternate-link',articleUrl);
            urlArray.push(articleUrl);
        }); 
        var fbXhr = new XMLHttpRequest();        
        fbXhr.open("GET", 'http://graph.facebook.com/?ids='+escape(urlArray.join()), true);
        fbXhr.onreadystatechange = function() {
          if (fbXhr.readyState == 4) {
            try{
                var resp = (JSON.parse(fbXhr.responseText));
                //var resp = (JSON.parse(fbXhr.responseText))['data'];
                $myjq('.u0Entry').each(function() {        
                    var ic = resp[$myjq(this).attr('data-alternate-link')].shares;
                    $myjq(this).attr('interaction-count',ic);                                        
                    if (!$myjq(this).children().hasClass("icount")){
                        $myjq('<div class="lastModified icount" style="float:right; width:32px; overflow:hidden; text-align:right; padding-right: 3px; padding-left: 0px"><span style="color:0c0;">'+((typeof ic === 'undefined')?'?':ic)+'</span></div>').insertAfter($myjq(this).find('.quicklisthandle'));                                       
                    }
                }); 
                sortFeed();
            }
            catch(e){console.log('Failed fb API: '+e.message);}      
          }
        }
        fbXhr.send();        
    }
    function sortFeed(){        
        //$myjq('.section').remove() // Remove date-wise section        
        if(sorted){
            newparent = $myjq('.u0Entry:first').parent();
            var fd = $myjq('.u0Entry').detach();
            newparent.prepend(orig_fd);
            sorted = false;
        } else {
            newparent = $myjq('.u0Entry:first').parent();
            try {
                var fd = $myjq('.u0Entry').detach();
                orig_fd = fd.slice(); //copy of unsorted array .. to undo sort
                fd.sort(function(a,b){
                    try{
                        var aa = $myjq(a).attr('interaction-count');//Populated from XMLHttpRequest
                        var bb = $myjq(b).attr('interaction-count');
                        //var aa = $myjq(a).find('.nbrRecommendations').attr('title');//Prepopulated by feedly - engagement number
                        //var bb = $myjq(b).find('.nbrRecommendations').attr('title');
                        aa = (typeof aa !== 'undefined') ? (parseInt(aa.replace(/[^\d]/g,'')) || 0) : 0;
                        bb = (typeof bb !== 'undefined') ? (parseInt(bb.replace(/[^\d]/g,'')) || 0) : 0;
                        return bb-aa;
                    }catch(e){console.log('Fail in sort '+e.message);}
                });
            }catch(e){
                console.log('Fail in sortFeed '+e.message);
            }finally{
                newparent.prepend(fd);
                sorted = true;
            }
        }
    }
    initVar();
}
