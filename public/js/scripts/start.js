/*global $, App*/
/*jshint multistr:true*/
$(function() {
	// create divs

var markup = 
"<div id='puton-container'>" +
    "<h1>Puton</h1>" +
    "<div id='puton-main'>" +
        "<b><label for='db'>db name: </label></b>" +
        "<input type='text' id='db'/>" +
    "</div>" +
    "<a href='#' id='hide-button'>Close</a>" +
    "<div id='log'></div>" +
"</div>";

	$(markup).appendTo($("body"));
	var x = new App();
	x.start();

    $('#hide-button').click(function(e) {
        $("#puton-container").hide();
        return false;
    });
});
