/**
 * Color utility functions, exposed as an AMD module.
 * No external dependencies.
 * Special thanks for the RGB to CIE conversion code goes out to the Q42 team
 * for their Q42.HueApi work. Dank u!
 * More info: https://github.com/Q42/Q42.HueApi.
 *
 * https://github.com/bjohnso5/hue-hacking
 * Copyright (c) 2013 Bryan Johnson; Licensed MIT */
var colors = function () {

    'use strict';

    /**
     * Represents a CIE 1931 XY coordinate pair.
     *
     * @param {Number} X coordinate.
     * @param {Number} Y coordinate.
     * @constructor
     */
    var XYPoint = function (x, y) {
            this.x = x;
            this.y = y;
        },

        Red = new XYPoint(0.704, 0.296),
        Lime = new XYPoint(0.2151, 0.7106),
        Blue = new XYPoint(0.138, 0.08),


        /**
         * Converts an RGB component to a hex string.
         *
         * @param {Number} RGB value, integer between 0 and 255.
         * @returns {String} Hex value string (e.g. FF)
         */
        componentToHex = function (c) {
            var hex = c.toString(16);
            return hex.length == 1 ? '0' + hex : hex;
        },

        /**
         * Converts RGB color components to a valid hex color string.
         *
         * @param {Number} RGB red value, integer between 0 and 255.
         * @param {Number} RGB green value, integer between 0 and 255.
         * @param {Number} RGB blue value, integer between 0 and 255.
         * @returns {String} Hex color string (e.g. FF0000)
         */
        rgbToHex = function (r, g, b) {
            return componentToHex(r) + componentToHex(g) + componentToHex(b);
        },


        /**
         * Returns the cross product of two XYPoints.
         *
         * @param {XYPoint} Point 1.
         * @param {XYPoint} Point 2.
         * @return {Number} Cross-product of the two XYPoints provided.
         */
        crossProduct = function (p1, p2) {
            return (p1.x * p2.y - p1.y * p2.x);
        },

        /**
         * Check if the provided XYPoint can be recreated by a Hue lamp.
         *
         * @param {XYPoint} XYPoint to check.
         * @return {boolean} Flag indicating if the point is within reproducible range.
         */
        checkPointInLampsReach = function (p) {
            var v1 = new XYPoint(Lime.x - Red.x, Lime.y - Red.y),
                v2 = new XYPoint(Blue.x - Red.x, Blue.y - Red.y),

                q = new XYPoint(p.x - Red.x, p.y - Red.y),

                s = crossProduct(q, v2) / crossProduct(v1, v2),
                t = crossProduct(v1, q) / crossProduct(v1, v2);

            return (s >= 0.0) && (t >= 0.0) && (s + t <= 1.0);
        },

        /**
         * Find the closest point on a line. This point will be reproducible by a Hue lamp.
         *
         * @param {XYPoint} The point where the line starts.
         * @param {XYPoint} The point where the line ends.
         * @param {XYPoint} The point which is close to the line.
         * @return {XYPoint} A point that is on the line, and closest to the XYPoint provided.
         */
        getClosestPointToLine = function (A, B, P) {
            var AP = new XYPoint(P.x - A.x, P.y - A.y),
                AB = new XYPoint(B.x - A.x, B.y - A.y),
                ab2 = AB.x * AB.x + AB.y * AB.y,
                ap_ab = AP.x * AB.x + AP.y * AB.y,
                t = ap_ab / ab2;

            if (t < 0.0) {
                t = 0.0;
            } else if (t > 1.0) {
                t = 1.0;
            }

            return new XYPoint(A.x + AB.x * t, A.y + AB.y * t);
        },

        getClosestPointToPoint = function (xyPoint) {
            // Color is unreproducible, find the closest point on each line in the CIE 1931 'triangle'.
            var pAB = getClosestPointToLine(Red, Lime, xyPoint),
                pAC = getClosestPointToLine(Blue, Red, xyPoint),
                pBC = getClosestPointToLine(Lime, Blue, xyPoint),

                // Get the distances per point and see which point is closer to our Point.
                dAB = getDistanceBetweenTwoPoints(xyPoint, pAB),
                dAC = getDistanceBetweenTwoPoints(xyPoint, pAC),
                dBC = getDistanceBetweenTwoPoints(xyPoint, pBC),

                lowest = dAB,
                closestPoint = pAB;

            if (dAC < lowest) {
                lowest = dAC;
                closestPoint = pAC;
            }

            if (dBC < lowest) {
                lowest = dBC;
                closestPoint = pBC;
            }

            return closestPoint;
        },

        /**
         * Returns the distance between two XYPoints.
         *
         * @param {XYPoint} The first point.
         * @param {XYPoint} The second point.
         * @param {Number} The distance between points one and two.
         */
        getDistanceBetweenTwoPoints = function (one, two) {
            var dx = one.x - two.x, // horizontal difference
                dy = one.y - two.y; // vertical difference

            return Math.sqrt(dx * dx + dy * dy);
        },

        /**
         * Returns an XYPoint object containing the closest available CIE 1931
         * coordinates based on the RGB input values.
         *
         * @param {Number} red RGB red value, integer between 0 and 255.
         * @param {Number} green RGB green value, integer between 0 and 255.
         * @param {Number} blue RGB blue value, integer between 0 and 255.
         * @return {XYPoint} CIE 1931 XY coordinates, corrected for reproducibility.
         */
        getXYPointFromRGB = function (red, green, blue) {

            var r = (red > 0.04045) ? Math.pow((red + 0.055) / (1.0 + 0.055), 2.4) : (red / 12.92),
                g = (green > 0.04045) ? Math.pow((green + 0.055) / (1.0 + 0.055), 2.4) : (green / 12.92),
                b = (blue > 0.04045) ? Math.pow((blue + 0.055) / (1.0 + 0.055), 2.4) : (blue / 12.92),

                X = r * 0.664511 + g * 0.154324 + b * 0.162028,
                Y = r * 0.283881 + g * 0.668433 + b * 0.047685,
                Z = r * 0.000088 + g * 0.072310 + b * 0.986039,

                cx = X / (X + Y + Z),
                cy = Y / (X + Y + Z);

            cx = isNaN(cx) ? 0.0 : cx;
            cy = isNaN(cy) ? 0.0 : cy;

            //Check if the given XY value is within the colourreach of our lamps.
            var xyPoint = new XYPoint(cx, cy),
                inReachOfLamps = checkPointInLampsReach(xyPoint);

            if (!inReachOfLamps) {
                var closestPoint = getClosestPointToPoint(xyPoint);
                cx = closestPoint.x;
                cy = closestPoint.y;
            }

            return new XYPoint(cx, cy);
        },

        /**
         * Returns a rgb array for given x, y values. Not actually an inverse of
         * getXYPointFromRGB. Implementation of the instructions found on the
         * Philips Hue iOS SDK docs: http://goo.gl/kWKXKl
         */
        getRGBFromXYAndBrightness = function (x, y, bri) {
            var xyPoint = new XYPoint(x, y);

            if (bri === undefined) {
                bri = 1;
            }

            // Check if the xy value is within the color gamut of the lamp.
            // If not continue with step 2, otherwise step 3.
            // We do this to calculate the most accurate color the given light can actually do.
            if (! checkPointInLampsReach(xyPoint)) {
                // Calculate the closest point on the color gamut triangle
                // and use that as xy value See step 6 of color to xy.
                xyPoint = getClosestPointToPoint(xyPoint);
            }

            // Calculate XYZ values Convert using the following formulas:
            var Y = bri,
                X = (Y / xyPoint.y) * xyPoint.x,
                Z = (Y / xyPoint.y) * (1 - xyPoint.x - xyPoint.y);

            // Convert to RGB using Wide RGB D65 conversion.
            var rgb =  [
                X * 1.612 - Y * 0.203 - Z * 0.302,
                -X * 0.509 + Y * 1.412 + Z * 0.066,
                X * 0.026 - Y * 0.072 + Z * 0.962
            ];

            // Apply reverse gamma correction.
            rgb = rgb.map(function (x) {
                return (x <= 0.0031308) ? (12.92 * x) : ((1.0 + 0.055) * Math.pow(x, (1.0 / 2.4)) - 0.055);
            });

            // Bring all negative components to zero.
            rgb = rgb.map(function (x) { return Math.max(0, x); });

            // If one component is greater than 1, weight components by that value.
            var max = Math.max(rgb[0], rgb[1], rgb[2]);
            if (max > 1) {
                rgb = rgb.map(function (x) { return x / max; });
            }

            rgb = rgb.map(function (x) { return Math.floor(x * 255); });

            return rgb;
        };

    /**
     * Publicly accessible functions exposed as API.
     */
    return {
        /**
         * Converts red, green and blue integer values to approximate CIE 1931
         * x and y coordinates. Algorithm from:
         * http://www.easyrgb.com/index.php?X=MATH&H=02#text2. May not produce
         * accurate values.
         *
         * @param {Number} red Integer in the 0-255 range.
         * @param {Number} green Integer in the 0-255 range.
         * @param {Number} blue Integer in the 0-255 range.
         * @return {Array{Number}} Approximate CIE 1931 x,y coordinates.
         */
        rgbToCIE1931 : function (red, green, blue) {
            var point = getXYPointFromRGB(red, green, blue);
            return [point.x, point.y];
        },

        /**
         * Returns the approximate hexColor represented by the supplied
         * CIE 1931 x,y coordinates and brightness value.
         *
         * @param {Number} X coordinate.
         * @param {Number} Y coordinate.
         * @param {Number} brightness value expressed between 0 and 1.
         * @return {String} hex color string.
         */
        CIE1931ToHex : function (x, y, bri) {
            if (bri === undefined) {
                bri = 1;
            }
            var rgb = getRGBFromXYAndBrightness(x, y, bri);
            return rgbToHex(rgb[0], rgb[1], rgb[2]);
        },

        hexFullRed:     "FF0000",
        hexFullGreen:   "00FF00",
        hexFullBlue:    "0000FF",
        hexFullWhite:   "FFFFFF"
    };
};

if(typeof(define) !== 'undefined' && typeof(define.amd) !== 'undefined') {
    define(colors);
} else {
    window.colors = colors();
}
