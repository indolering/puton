/*jshint multistr:true*/

// ## Templates
var tmpl = {};

tmpl.app = "\
<h1>Puton</h1>\
<div id='puton-main'>\
</div>\
<a href='#' id='hide-button'>Close</a>\
<div id='log'></div>";

tmpl.mainView = "\
<b><label for='db'>db name: </label></b>\
<input type='text' id='db'/>";

tmpl.log = "\
<p class='log log-<%- type %>'>\
    <b>\
        <small class='count'>\
            <%- count %>\
        </small>\
    </b>\
    <%- log %>\
</p>";


tmpl.doc_full = "\
<div class='optionsbar'>\
    <a class='option revoption'>revs</a>\
    &nbsp;|&nbsp;\
    <a class='option editoption'>edit</a>\
    &nbsp;|&nbsp;\
    <a class='option deleteoption'>delete</a>\
</div>\
<h3 class='key'><%- key %></h3>\
<pre class='value'><%= value %></pre>";

tmpl.doc_collapsed = "\
<span class='key'><%- key %></span>\
&nbsp;\
<span class='value'><%- trunc %></span>";

tmpl.doc_edit = "\
<textarea class='code-edit' name='code'><%= code %></textarea>\
<button class='code-edit-save'>Save</button>";

tmpl.tabs = "\
<div class='docs'></div>";

tmpl.queryInput = "\
    Map: \
    <textarea class='code-edit code-map' name='map'>function(doc) {\n\
\n\
\n\}</textarea>\
    Reduce: \
    <textarea class='code-edit code-reduce' name='reduce'></textarea>\
    <button class='run'>Run Query</button>\
    <div class='docs'></div>\
    \
";

tmpl.db = "\
    <h2><%- db_name %></h2>\
    <small>(database name)</small>\
    <p>\
        <b>doc_count: </b>\
        <%- doc_count %>\
    </p>\
    <p>\
        <b>update_seq: </b>\
        <%- update_seq %>\
    </p>\
    <div id='puton-toolbar'>\
    </div>\
    <div id='tabs'>\
    <div class='docs'></div>\
    </div>\
";

tmpl.toolbar = "\
    <a class='button' id='query'>Run Query</a>\
    <a class='button' id='adddoc'>Add document</a>\
    <div id='puton-tabbuttons'></div>\
";

tmpl.documents = "\
    <div class='docs-container'></div>\
    <div id='puton-revs-container'></div>\
";
tmpl.revisions = "<div class='revisions'></div>";
tmpl.rev_full = "\
    <h3 class='key'><%- key %></h3>\
    <pre class='value'><%= value %></pre>\
";

tmpl.tabbutton = "<a class='tabbutton><%- label %></a>";

// ## Compile templates/partials
var compiled = {};
_.each(_.keys(tmpl), function(key){
    compiled[key] = _.template(tmpl[key]);
});
tmpl = compiled;

// stolen from SO.
function syntaxHighlight(json, nohtml) {
    if (typeof json !== 'string') {
         json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}
/* .jshintrc eval:ignore */
window.Puton = (function() {
    //
    // Global Puton Object
    //
    var Puton = function() {
        this._app = new Puton.app();
        this._app.start();
    };

    //
    // Main Application
    //
    Puton.app = Backbone.View.extend({
        id: "puton-container",
        tagName: "div",
        initialize: function() {
        },
        start: function() {
            this.render();
            this.logview = new v.Log();
            this.mainPage();
        },
        render: function() {
            this.$el.html(tmpl.app());
            return this;
        },
        events: {
            "changeView": "changeView",
            "selectDB": "selectDB",
            "click h1": "mainPage",
            "click #hide-button": "hide"
        },
        mainPage: function(e) {
            this.currentView = new v.Main({
                el: this.$("#puton-main")
            }).render();
        },
        hide: function(e) {
            this.$el.hide();
        },
        selectDB: function(e, dbname) {
            var that = this;
            Pouch(dbname, function(err, db) {
                if (err) {
                    console.error(err);
                    return;
                }

                // tmp.
                window.db = db;

                var database = new m.DB(null, {db: db});

                that.changeView(null, database);
            });
        },
        changeView: function(e, model) {
            // TODO.
            // garbage collection
            this.currentView = new v.DB({
                el: this.$("#puton-main"),
                model: model
            });
            this.currentView.render();
        }
    });

    //
    // Views
    //
    var v = {};
    v.Main = Backbone.View.extend({
        events: {
            "keydown #db": "submit"
        },
        render: function() {
            this.$el.html(tmpl.mainView());
            return this;
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

    v.Log = Backbone.View.extend({
        el: "#log",
        initialize: function() {
            var self = this;
            self.count = 0;

            ['log','info','error'].forEach(function(type) {
                var orin = console[type];
                console[type] = function(str) {
                    orin.call(console, arguments[0]);
                    self.log(str, type);
                    //orin.apply(console, Array.prototype.splice.call(arguments));
                };
            });
        },
        log: function(str, type) {
            type = type || "log";

            function datafy(obj) {
                var tr;
                if ($.isArray(obj)) {
                    tr = [];
                    obj.forEach(function(x) {
                        tr.push(datafy(x));
                    });
                    return tr;
                } else if (typeof obj === 'object') {
                    tr = [];
                    for (var key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            tr.push( {
                                label: key,
                                children: datafy(obj[key])
                            });
                        }
                    }
                    return tr;
                } else {
                    return [{label: obj}];
                }
            }
            if (typeof str === 'object') {
                this.$el.prepend(
                    $('<div class="log-'+type+'"/>').tree( {
                        data: datafy(str),
                        autoOpen: true,
                        slide: false
                    }));
            } else {

                this.$el.prepend(tmpl.log({
                    count: ++this.count,
                    log: str,
                    type: type
                }));
            }
        }
    });

    v.DB = Backbone.View.extend({
        initialize: function() {
            this.listenTo(this.model, "all", this.render);
        },
        events: {
            "click #adddoc": "addDoc",
            "click #query": "query",
            "deleteDocument": "deleteDocument",
            "changeTab": "changeTab"
        },
        changeTab: function(e, tab) {
            tab.render();
            this.toolbar.active(tab);
        },
        deleteDocument: function(e, doc_id) {
            var that = this;
            that.model.db.get(doc_id, function(err, doc) {
                if (err) {
                    // TODO.
                    console.log(err);
                }

                that.model.db.remove(doc, function(err, response) {
                    that.model.docs.remove(doc_id);
                });
            });
        },
        addDoc: function(e) {
            var self = this;
            var x = prompt("Document: ", '{}').trim();
            try {
                if (x.length === 0 || x[0] !== '{' || x[x.length-1] !== '}') {
                    throw("Not a valid object");
                }
                try {
                    x = JSON.parse(x);
                } catch (err) {
                    eval("x="+x);
                }

                if (typeof x !== 'object') {
                    throw("Not a valid object");
                }

                self.model.db.put(x, function(err, res) {
                    if (err) {
                        console.error(err);
                    }
                    self.model.db.get(res.id, function(err, res) {
                        self.model.docs.add(res, {
                            at: 0
                        });
                    });
                });

            } catch(err) {
                console.error(err);
            }
        },
        query: function() {
            var query = new v.Query({
                el: this.$(".docs"),
                db: this.model.db
            });
            this.toolbar.addtab(query);
            query.render();
        },
        render: function() {
            this.$el.html(tmpl.db(this.model.toJSON()));
            this.toolbar = new v.Toolbar({
                el: this.$("#puton-toolbar")
            });

            var all =  new v.Documents({
                el: this.$(".docs"),
                collection: this.model.docs
            });
            all.render();

            // add tab
            all.tabname = "Main";
            this.toolbar.addtab(all);
        }
    });

    v.Toolbar = Backbone.View.extend({
        initialize: function() {
            this.tabs = [];
            this.tabviews = [];
        },
        addtab: function(tab) {
            this.tabs.push(tab);
            this.render();
            this.active(tab);
        },
        active: function(tab) {
            _.each(this.tabviews, function(tabview) {
                if (tabview.view === tab) {
                    tabview.$el.addClass("active");
                } else {
                    tabview.$el.removeClass("active");
                }
            });
        },
        render: function() {
            this.$el.html(tmpl.toolbar());
            var that = this;
            if (this.tabs.length > 1) {
                _.each(this.tabs, function(tab, index) {
                    var x = new v.Tab({
                        count: index,
                        view: tab
                    });
                    that.tabviews.push(x);
                    that.$("#puton-tabbuttons").append(x.render().el);
                });
            }

            return this;
        }
    });

    v.Tab = Backbone.View.extend({
        className: "tabbutton",
        initialize: function(options) {
            this.count = options.count;
            this.view = options.view;
        },
        events: {
            "click": "changeTab"
        },
        changeTab: function() {
            this.$el.trigger("changeTab", this.view);
        },
        render: function() {
            this.$el.html(this.view.tabname || "Query "+this.count);
            return this;
        }
    });

    v.Query = Backbone.View.extend({
        initialize: function(opts) {
            this.state = 0;
            this.db = opts.db;
            
            this.docs = new m.Documents(null, {db: this.db, populate: false});
        },
        events: {
            'click .run': 'runQuery'
        },
        render: function() {
            var self = this;
            if (this.state === 0) {
                this.$el.html(tmpl.queryInput());
            }

            var map = false;
            self.cm = {};
            ['map','reduce'].forEach(function(el) {
                self.cm[el]  = CodeMirror.fromTextArea(self.$el.find('.code-'+el).get(0),{
                    lineNumbers: true,
                    tabSize: 4,
                    indentUnit: 4,
                    indentWithTabs: true,
                    mode: "text/javascript"
                });
            });
            self.cm.map.focus();


            this.documentsView =  new v.Documents({
                el: this.$el.find(".docs"),
                collection: this.docs
            });
            this.documentsView.render();

        },
        runQuery: function() {
            var self = this;
            var map = self.cm.map.getValue().trim();
            var reduce = self.cm.reduce.getValue().trim();
            var hasReduce;
            var query = {};


            eval("query.map = " + map);
            if (reduce) {
                eval("query.reduce = " + reduce);
                hasReduce = true;
            } else {
                hasReduce = false;
            }

            //query = {map: function (doc) {
            //    emit(doc.id, doc);
            //}};
            //hasReduce = false;
            this.db.query(query, {reduce: hasReduce, include_docs: true, conflicts: true}, function(_, res) {
                self.docs.reset();
                // TODO: proper result of key value
                // and remove edit / delete
                //console.debug(res);
                res.rows.forEach(function(x, i) {
                    self.docs.add({
                        key: x.key,
                        value: x.value
                    });
                });
            });
        }
    });

    v.Documents = Backbone.View.extend({
        initialize: function() {
            this.listenTo(this.collection, "reset", this.render);
            this.listenTo(this.collection, "add", this.render);
            this.listenTo(this.collection, "remove", this.render);
        },
        render: function() {

            var fragment = document.createDocumentFragment();
            this.collection.each(function(doc){
                var docview = new v.Document({
                    model: doc,
                    db: this.db
                });
                fragment.appendChild(docview.render().el);
            });
            this.$el.html(tmpl.documents);
            this.$el.find('.docs-container').html(fragment);
        }
    });

    v.Revisions = Backbone.View.extend({
        className: 'revs',
        initialize: function(opts) {
            this.db = opts.db;
            this.doc_id = opts.doc_id;
        },
        render: function() {
            var $el = this.$el;
            var doc_id = this.doc_id;

            this.db.get(doc_id, {
                revs: true,
                revs_info: true
            }, function(err, doc) {
                if (err) {
                    return console.error(err);
                }

                var $fragment = $(tmpl.revisions({}));
                
                doc._revs_info.forEach(function(rev) {
                    var revisionView = new v.Revision({
                        db: this.db
                    });
                    var $tmp = $('<div/>');
                    $fragment.append($tmp);

                    if (rev.status === 'available') {
                        this.db.get(doc_id, {rev: rev.rev}, function(err, doc) {
                            if (err) {
                                return console.error(err);
                            }
                            $tmp.html( 
                                revisionView.render(doc, doc_id).el );
                            reRender();
                        });
                    } else {
                        $tmp.html( 
                            revisionView.render(false, doc_id).el );
                    }

                });

                function reRender() {
                    $el.html($fragment);
                }
                reRender();

            });
        }
    });

    v.Revision = Backbone.View.extend({
        className: 'rev',
        render: function(doc, doc_id) {
            var model = doc;

            if (model) {
                this.$el.html(tmpl.rev_full({
                    key: model._rev,
                    value: syntaxHighlight(model)
                }));
            } else {
                this.$el.html(tmpl.rev_full({
                    key: doc_id,
                    value: 'compacted'
                }));
            }

            return this;
        }
    });

    v.Document = Backbone.View.extend({
        className: "doc",
        initialize: function(opts) {
            this.show = "collapsed";
            this.db = opts.db;
        },
        render: function() {
            var model = this.model;
            if (this.show === "collapsed") {
                this.$el.html(tmpl.doc_collapsed({
                    key: model.toJSON().key || this.model.id,
                    trunc: JSON.stringify(model.toJSON()).substring(0, 20) + "..."
                }));
            } else if (this.show === 'full') {
                this.$el.html(tmpl.doc_full({
                    key: model.toJSON().key || this.model.id,
                    value: syntaxHighlight(model.toJSON())
                }));
                if (!this.model.id) {
                    // todo: more proper hiding of edit/delete
                    this.$el.find('.optionsbar').hide();
                }
            } else if (this.show === 'edit') {
                var modelJson = model.toJSON();
                ['_rev','_id'].forEach(function(key) {
                    if (key in modelJson) {
                        delete modelJson[key];
                    }
                });
                this.$el.html(tmpl.doc_edit({
                    code: JSON.stringify(modelJson, undefined, 2)
                }));
                this.codeEdit = CodeMirror.fromTextArea(this.$el.find('.code-edit').get(0),{
                    lineNumbers: false,
                    tabSize: 4,
                    indentUnit: 4,
                    indentWithTabs: true,
                    mode: "application/json",
                    autofocus: true
                });
            }
            return this;
        },
        saveEdit: function(e) {
            var self = this;
            e.preventDefault();
            e.stopPropagation();

            var json = this.codeEdit.getValue().trim();
            try {
                if (!json || json[0] !== '{' || json[json.length-1] !== '}' || (json = JSON.parse(json)) === false) {
                    throw("Not a valid object");
                }
                
                json._id = (this.model.toJSON())._id;
                json._rev = (this.model.toJSON())._rev;

                this.db.put(json, function(err, res) {
                    if (err) {
                        return console.error(err);
                    }

                    this.db.get(json._id, function(err, res) {
                        if (err) {
                            return console.error(err);
                        }
                        
                        self.model.set(res);
                        self.show = "full";
                        self.render();
                    });
                });
            } catch (err) {
                console.error(err);
                this.show = "full";
                this.render();
            }
        },
        events: {
            "click .revoption": "revOption",
            "click .editoption": "editOption",
            "click .deleteoption": "deleteOption",
            "click": "toggleView",
            "click .code-edit-save": "saveEdit"
        },
        editOption: function(e) {
            e.preventDefault();
            e.stopPropagation();

            this.show = 'edit';
            this.render();
        },
        deleteOption: function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (confirm("Delete Document?")) {
                // this.model.id
                this.$el.trigger("deleteDocument", this.model.id);
            }
        },
        revOption: function(e) {
            e.preventDefault();
            e.stopPropagation();

            var revisions = new v.Revisions({
                el: $("#puton-revs-container"),
                db: this.db,
                doc_id: (this.model.toJSON())._id
            });
            revisions.render();
        },
        toggleView: function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (this.show ===  'edit') {
                return;
            }

            this.show = this.show === "collapsed" ?
                "full" : "collapsed";

            this.render();
        }
    });

    Puton.views = v;

    //
    // Models
    //
    var m = {};

    Backbone.Model.prototype.idAttribute = "_id";

    m.Document = Backbone.Model.extend({});

    m.Documents = Backbone.Collection.extend({
        initialize: function(models, options) {
            var that = this;
            this.db = options.db;
            if ('populate' in options && options.populate === false) {
            } else {
                this.db.allDocs({include_docs: true}, function(err, res) {
                    that.add(_.pluck(res.rows, "doc"));
                });
            }
        },
        model: m.Document
    });

    m.DB = Backbone.Model.extend({
        initialize: function(attr, options) {
            var that = this;
            this.db = options.db;
            this.docs = new m.Documents(null, {db: this.db});
            
            // bootstrap database
            this.db.info(function(err, info) {
                that.set(info);
            });
        },
        defaults: {
            "db_name": "",
            "doc_count": "",
            "update_seq": ""
        }
    });

    m.Tab = Backbone.Model.extend({});

    m.Tabs = Backbone.Collection.extend({
        initialize: function(models, options) {
            var that = this;
        },
        model: m.Tab
    });

    Puton.models = m;

    return Puton;
})();

/*jshint multistr:true*/
$(function() {
    //
    // Start Puton
    //
    var puton = new Puton();
    $('body').append(puton._app.$el);

    if (typeof window.PUTON_LOADED && window.PUTON_LOADED === -1) {
        window.PUTON_LOADED = 1;
    }
});
