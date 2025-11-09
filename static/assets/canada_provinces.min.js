/*!
 *
 * Jquery Mapael - Dynamic maps jQuery plugin (based on raphael.js)
 * Requires jQuery and Mapael
 *
 * Map of Canada by province/territory
 * 
 * Provinces: AB, BC, MB, NB, NL, NS, ON, PE, QC, SK
 * Territories: NT, NU, YT
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
    
    // Register the Canada provinces map
    Mapael.maps.canada_provinces = {
                    width : 1000,
                    height : 800,
                    getCoords : function (lat, lon) {
                        // Simple projection for Canada
                        var coords = {};
                        var xOffset = 0;
                        var yOffset = 0;
                        var scaleX = 8.0;
                        var scaleY = -8.0; // Negative for north-up orientation
                        
                        // Convert lat/lon to x/y (simplified Mercator-like projection)
                        coords[0] = (lon + 95) * scaleX + xOffset;
                        coords[1] = (lat - 50) * scaleY + yOffset;
                        
                        return {x : coords[0], y : coords[1]};
                    },
                    elems : {
                        // British Columbia (BC) - Western province, coastal with irregular coastline
                        "BC" : "m 80,280 60,0 20,-15 40,8 35,18 10,25 -8,32 -20,14 -35,7 -42,-4 -32,-20 -10,-25 18,-20 z",
                        // Alberta (AB) - Rectangular, between BC and SK
                        "AB" : "m 140,280 100,0 0,80 -100,0 z",
                        // Saskatchewan (SK) - Rectangular, central
                        "SK" : "m 240,280 100,0 0,80 -100,0 z",
                        // Manitoba (MB) - Rectangular, east of SK
                        "MB" : "m 340,280 90,0 0,80 -90,0 z",
                        // Ontario (ON) - Large, central-eastern province (wider at top, irregular shape)
                        "ON" : "m 430,280 120,0 30,22 18,50 -8,65 -30,35 -68,10 -50,-18 -18,-43 8,-65 z",
                        // Quebec (QC) - Large, eastern province (tall, wider at top)
                        "QC" : "m 550,280 60,0 10,30 5,50 -5,65 -18,50 -30,18 -10,-35 0,-50 10,-65 z",
                        // New Brunswick (NB) - Small, eastern (rectangular)
                        "NB" : "m 610,320 28,0 0,22 -28,0 z",
                        // Nova Scotia (NS) - Peninsula, east of NB (irregular peninsula shape)
                        "NS" : "m 620,342 18,0 4,10 -4,15 -13,4 -4,-10 0,-10 z",
                        // Prince Edward Island (PE) - Small island, east of NB
                        "PE" : "m 615,330 9,0 3,5 -3,7 -6,3 -3,-5 0,-5 z",
                        // Newfoundland and Labrador (NL) - Large, easternmost (L-shaped, tall)
                        "NL" : "m 650,260 28,0 5,30 3,50 -5,35 -10,22 -14,-18 -5,-30 5,-50 0,-45 z",
                        // Yukon (YT) - Northwest territory (rectangular, top-left)
                        "YT" : "m 60,80 65,0 10,18 5,32 -5,35 -22,18 -28,-10 -16,-32 0,-32 z",
                        // Northwest Territories (NT) - Large northern territory (wide, irregular)
                        "NT" : "m 125,120 130,0 18,22 10,50 -10,65 -28,32 -65,-18 -36,-43 -10,-50 0,-58 z",
                        // Nunavut (NU) - Largest territory, central-northern (very wide, irregular)
                        "NU" : "m 255,120 130,0 28,35 18,65 -18,80 -35,43 -65,-22 -35,-50 -18,-65 0,-90 z"
                    }
                };

    // Also ensure it's accessible via $.mapael.maps and $.fn.mapael.maps
    // jQuery Mapael looks in both places
    if ($.mapael) {
        if (!$.mapael.maps) {
            $.mapael.maps = {};
        }
        $.mapael.maps.canada_provinces = Mapael.maps.canada_provinces;
    }
    
    if ($.fn && $.fn.mapael) {
        if (!$.fn.mapael.maps) {
            $.fn.mapael.maps = {};
        }
        $.fn.mapael.maps.canada_provinces = Mapael.maps.canada_provinces;
    }
    
    // Also set it on the global Mapael object
    if (typeof Mapael !== 'undefined' && Mapael.maps) {
        Mapael.maps.canada_provinces = Mapael.maps.canada_provinces;
    }

    return Mapael;

}));

