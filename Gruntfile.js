module.exports = function(grunt) {
    var libFiles = [
        'public/js/libs/jquery.js',
        'public/js/libs/jquery.tree.js',
        'public/js/libs/underscore.js',
        'public/js/libs/codemirror.js',
        'public/js/libs/backbone.js',
        'public/js/libs/pouch.js',
        'public/js/libs/pouchdb.visualizeRevTree.js'
    ];
    var sourceFiles = [
        // templates
        'public/js/templates/template.js',

        // scripts
        'public/js/scripts/utils.js',
        'public/js/scripts/app.js',
        'public/js/scripts/start.js'
    ];

    var allFiles = libFiles;
    for (var i=0;i<sourceFiles.length;++i) { allFiles.push(sourceFiles[i]); }

    grunt.initConfig({
        clean: ['public/dist/'],
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            files: [
                "public/js/scripts/*.js"
            ]
        },
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            dist: {
                src: sourceFiles,
                dest: 'public/dist/debug/scripts.js'
            },
            // concat the library files only
            lib: {
                src: libFiles,
                dest: 'public/dist/debug/lib.js'
            },
            // combine minified pouch with minifed lib
            fulldist: {
                src: ['public/dist/debug/lib.min.js', 'public/dist/debug/scripts.min.js'],
                dest: 'public/dist/release/puton.min.js'
            }
        },
        uglify: {
            dist: {
                files: {
                    'public/dist/debug/scripts.min.js': [
                        'public/dist/debug/scripts.js'
                    ]
                }
            },
            lib: {
                files: {
                    'public/dist/debug/lib.min.js': [
                        'public/dist/debug/lib.js'
                    ]
                }
            }
        },
        cssmin: {
            compress: {
                files: {
                    "public/dist/release/puton.css": [
                        "public/css/codemirror.css",
                        "public/dist/debug/style.css"
                    ]
                }
            }
        },
        less: {
            release: {
                files: {
                    'public/dist/debug/style.css': 'public/css/style.less'
                }
            }
        },
        jasmine: {
            all: {
              src: allFiles,
              options: {
                specs: 'spec/*.spec.js'
              }
            }
        },
        connect: {
            server: {
                options: {
                    port: 9001,
                    base: "spec",
                    keepalive: true,
                    middleware: function(connect, options) {
                        return [
                            connect.static('public'),
                            connect.static('spec'),
                            connect.directory(options.base)
                        ];
                    }
                }
            }
        },
        exec: {
            default: {
                cmd: 'node puton.js'
            },
            production: {
                cmd: 'NODE_ENV=production node puton.js'
            },
            updatePouch: {
                cmd: 'curl -o public/js/libs/pouch.js http://download.pouchdb.com/pouchdb-nightly.js'
            },
            updateBackbone: {
                cmd: 'curl -o public/js/libs/backbone.js http://backbonejs.org/backbone.js'
            },
            updateUnderscore: {
                cmd: 'curl -o public/js/libs/underscore.js http://underscorejs.org/underscore.js'
            },
            updatejQuery: {
                cmd: 'curl -o public/js/libs/jquery.js http://code.jquery.com/jquery.js'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-exec');

    grunt.registerTask('lint', ['jshint']);
    grunt.registerTask('test', ['jasmine']);
    grunt.registerTask('browsertest', ['connect']);
    grunt.registerTask('build', ['concat:dist', 'uglify:dist', 'concat:fulldist', 'less:release']);
    grunt.registerTask("minify", ['cssmin']);
    grunt.registerTask("updatelibs", ['exec:updateBackbone', 'exec:updateUnderscore', 'exec:updatejQuery', 'build:lib']);
    grunt.registerTask("updatepouch", ['exec:updatePouch']);
    grunt.registerTask("release", ['lint','updatepouch','test', 'build', 'minify']);
    grunt.registerTask("default", ['release']);
    grunt.registerTask("run", ['exec:default']);


    grunt.registerTask("build:lib", ['concat:lib', 'uglify:lib']);
    grunt.registerTask("build:all", ['build:lib', 'build', 'minify']);
};
