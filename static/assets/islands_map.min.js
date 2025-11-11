/*!
 *
 * Jquery Mapael - Dynamic maps jQuery plugin (based on raphael.js)
 * Requires jQuery and Mapael
 *
 * Islands Map - Ocean with islands representing challenge categories
 * Each island represents a category, and challenges appear as dots on their island
 */
(function (factory) {
    if (typeof exports === 'object') {
        // CommonJS
        module.exports = factory(require('jquery'), require('mapael'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery', 'mapael'], factory);
    } else {
        // Browser globals - wait for jQuery and Mapael to be ready
        if (typeof jQuery !== 'undefined' && jQuery.mapael) {
            factory(jQuery, jQuery.mapael);
        } else {
            // Wait for jQuery and Mapael to load
            (function waitForMapael() {
                if (typeof jQuery !== 'undefined' && jQuery.mapael && jQuery.mapael.maps) {
                    factory(jQuery, jQuery.mapael);
                } else {
                    setTimeout(waitForMapael, 50);
                }
            })();
        }
    }
}(function ($, Mapael) {

    "use strict";
    
    // Ensure Mapael.maps exists
    if (!Mapael.maps) {
        Mapael.maps = {};
    }
    
    // Register the Islands map
    Mapael.maps.islands = {
        width : 1000,
        height : 800,
        getCoords : function (lat, lon) {
            // Simple projection for the islands map
            var coords = {};
            var xOffset = 500;
            var yOffset = 400;
            var scaleX = 8.0;
            var scaleY = -8.0;
            
            coords[0] = (lon + 95) * scaleX + xOffset;
            coords[1] = (lat - 50) * scaleY + yOffset;
            
            return {x : coords[0], y : coords[1]};
        },
        elems : {
            // Island 1 - Top left
            "ISLAND1" : "m 150,150 80,0 40,30 20,50 -20,60 -40,40 -60,20 -40,-30 -20,-50 20,-60 40,-20 z",
            // Island 2 - Top center
            "ISLAND2" : "m 400,120 100,0 50,40 30,70 -30,80 -50,50 -70,30 -50,-40 -30,-70 30,-80 50,-30 z",
            // Island 3 - Top right
            "ISLAND3" : "m 700,150 80,0 40,30 20,50 -20,60 -40,40 -60,20 -40,-30 -20,-50 20,-60 40,-20 z",
            // Island 4 - Middle left
            "ISLAND4" : "m 200,350 90,0 45,35 25,60 -25,70 -45,45 -65,25 -45,-35 -25,-60 25,-70 45,-25 z",
            // Island 5 - Middle center
            "ISLAND5" : "m 450,320 110,0 55,40 30,70 -30,80 -55,50 -75,30 -55,-40 -30,-70 30,-80 55,-30 z",
            // Island 6 - Middle right
            "ISLAND6" : "m 720,350 90,0 45,35 25,60 -25,70 -45,45 -65,25 -45,-35 -25,-60 25,-70 45,-25 z",
            // Island 7 - Bottom left
            "ISLAND7" : "m 180,550 85,0 42,32 23,55 -23,65 -42,42 -62,23 -42,-32 -23,-55 23,-65 42,-23 z",
            // Island 8 - Bottom center
            "ISLAND8" : "m 480,520 105,0 52,38 28,65 -28,75 -52,48 -72,28 -52,-38 -28,-65 28,-75 52,-28 z",
            // Island 9 - Bottom right
            "ISLAND9" : "m 750,550 85,0 42,32 23,55 -23,65 -42,42 -62,23 -42,-32 -23,-55 23,-65 42,-23 z",
            // Island 10 - Far left
            "ISLAND10" : "m 80,400 70,0 35,25 18,45 -18,55 -35,35 -52,18 -35,-25 -18,-45 18,-55 35,-18 z",
            // Island 11 - Far right
            "ISLAND11" : "m 850,400 70,0 35,25 18,45 -18,55 -35,35 -52,18 -35,-25 -18,-45 18,-55 35,-18 z",
            // Island 12 - Top far left
            "ISLAND12" : "m 50,200 60,0 30,20 15,40 -15,50 -30,30 -45,15 -30,-20 -15,-40 15,-50 30,-15 z",
            // Island 13 - Top far right
            "ISLAND13" : "m 890,200 60,0 30,20 15,40 -15,50 -30,30 -45,15 -30,-20 -15,-40 15,-50 30,-15 z"
        }
    };

    // Also ensure it's accessible via $.mapael.maps and $.fn.mapael.maps
    if ($.mapael) {
        if (!$.mapael.maps) {
            $.mapael.maps = {};
        }
        $.mapael.maps.islands = Mapael.maps.islands;
    }
    
    if ($.fn && $.fn.mapael) {
        if (!$.fn.mapael.maps) {
            $.fn.mapael.maps = {};
        }
        $.fn.mapael.maps.islands = Mapael.maps.islands;
    }
    
    // Also set it on the global Mapael object
    if (typeof Mapael !== 'undefined' && Mapael.maps) {
        Mapael.maps.islands = Mapael.maps.islands;
    }

    return Mapael;

}));

