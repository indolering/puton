/*global define:true, alert bootstrap:true*/
define([
    'jquery',
    'underscore',
    'backbone',
    'pouch',
    'templates'
], function ($, _, Backbone, Pouch, tmpl) {
    var Log = Backbone.View.extend({
        el: "#log",
        initialize: function() {
            var that = this;
            console.yo = console.log;
            console.ynfo = console.info;

            console.log = function(str){
                that.log(str);
                console.yo.apply(console, Array.prototype.splice.call(arguments));
            };

            console.info = function(str) {
                that.log(str);
                console.ynfo.apply(console, Array.prototype.splice.call(arguments));
            };
        },
        log: function(str) {
            if (typeof str !== 'string') {
                str = JSON.stringify(str);
            }
            this.$el.append(tmpl.log({log: str}));
        }
    });
    var App = Backbone.View.extend({
        el: "#container",
        initialize: function() {
            
        },
        start: function() {
            this.logview = new Log();
            this.currentView = new Main({
                el: this.$("#main")
            });
        },
        events: {
            "changeView": "changeView",
            "selectDB": "selectDB"
        },
        selectDB: function(e, dbname) {
            var that = this;
            Pouch(dbname, function(err, db) {
                if (err) {
                    // TODO.
                    alert(err);
                    return;
                }

                var database = new m.DB(null, {db: db});

                // that.changeView(null, new m.DB(db));
            });
        },
        changeView: function(e, model) {

        }
    });

    var Main = Backbone.View.extend({
        events: {
            "keydown #db": "submit"
        },
        submit: function(e) {

            if (e.keyCode === 13) {
                var dbname = this.$("#db").val();

                // prevent empty string
                if (dbname.length === 0) {
                    // noop.
                    return;
                }

                this.$el.trigger('selectDB', dbname);
            }
        }
    });

    var DB = Backbone.View.extend({
        initialize: function() {

        },
        render: function() {
            this.collection.each(function(doc){

            });
        }
    });

    var m = {};
    m.DB = Backbone.Model.extend({
        initialize: function(attr, options) {
            var that = this;
            this.db = options.db;
            this.docs = new m.Documents();
            
            // bootstrap database
            this.db.info(function(err, info) {
                console.log(info);
                that.set(info);
            });

            this.db.allDocs(function(err, res) {
                console.log(res);
            });
        }
    });

    m.Documents = Backbone.Collection.extend({
        model: m.Document
    });

    m.Document = Backbone.Model.extend({
        initialize: function() {

        }
    });

    return App;
});