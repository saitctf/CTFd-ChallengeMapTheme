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
        // Browser globals
        factory(jQuery, jQuery.mapael);
    }
}(function ($, Mapael) {

    "use strict";
    
    $.extend(true, Mapael,
        {
            maps :{
                canada_provinces : {
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
                        // British Columbia (BC) - Western province, mountainous
                        "BC" : "m 150,250 120,0 40,-25 80,15 60,30 20,45 -15,60 -40,30 -60,15 -80,-8 -60,-38 -20,-45 35,-38 z",
                        // Alberta (AB) - Rectangular, between BC and SK
                        "AB" : "m 270,250 120,0 0,90 -120,0 z",
                        // Saskatchewan (SK) - Rectangular, central
                        "SK" : "m 390,250 120,0 0,90 -120,0 z",
                        // Manitoba (MB) - Rectangular, east of SK
                        "MB" : "m 510,250 100,0 0,90 -100,0 z",
                        // Ontario (ON) - Large, central-eastern province
                        "ON" : "m 610,250 140,0 40,30 25,60 -15,75 -40,45 -80,15 -60,-23 -25,-53 15,-75 z",
                        // Quebec (QC) - Large, eastern province
                        "QC" : "m 750,250 70,0 15,38 8,60 -8,75 -23,60 -38,23 -15,-45 0,-60 15,-75 z",
                        // New Brunswick (NB) - Small, eastern
                        "NB" : "m 820,340 35,0 8,23 -8,30 -25,15 -8,-15 0,-23 z",
                        // Nova Scotia (NS) - Peninsula, east of NB
                        "NS" : "m 835,380 25,0 8,15 -8,23 -15,8 -8,-15 0,-15 z",
                        // Prince Edward Island (PE) - Small island, east of NB
                        "PE" : "m 825,360 12,0 4,8 -4,11 -8,4 -4,-8 0,-8 z",
                        // Newfoundland and Labrador (NL) - Large, easternmost
                        "NL" : "m 880,280 35,0 8,38 4,60 -8,45 -15,30 -20,-23 -8,-38 8,-60 0,-53 z",
                        // Yukon (YT) - Northwest territory
                        "YT" : "m 100,100 80,0 15,23 8,38 -8,45 -32,23 -40,-15 -23,-38 0,-38 z",
                        // Northwest Territories (NT) - Large northern territory
                        "NT" : "m 180,150 160,0 25,30 15,60 -15,75 -40,38 -80,-23 -48,-53 -15,-60 0,-68 z",
                        // Nunavut (NU) - Largest territory, central-northern
                        "NU" : "m 340,150 160,0 40,45 25,75 -25,90 -48,53 -80,-30 -48,-60 -25,-75 0,-98 z"
                    }
                }
            }
        }
    );

    return Mapael;

}));

