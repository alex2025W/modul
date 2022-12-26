'use strict';

var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var node_underscorify = require('node-underscorify');
var gutil = require('gulp-util');
var watch = require('gulp-watch');
var shell = require('gulp-shell');
var lec = require('gulp-line-ending-corrector');
var rimraf = require('rimraf');
var gulpSequence = require('gulp-sequence');
var sass = require('gulp-sass');

/// SCSS

gulp.task('scss:build', () => {
  return gulp.src([
    './static/css/client.scss',
    './static/css/order.scss',
    './static/css/main.scss',
    './static/css/crm.scss',
    './static/css/adaptive.scss'
  ])
    .pipe(sass())
    .pipe(gulp.dest('./static/css'));
});

///--------------------------------------------------------------------------------------
/// timeline
///--------------------------------------------------------------------------------------
var requirejs = require('requirejs');
gulp.task('timeline:clear', (cb) => rimraf('./timeline-build', cb));
gulp.task('timeline:jsbuild', shell.task('r_js -o ./timeline_src/js/app.build.js'));
gulp.task('timeline:jsbuild_debug', shell.task('r_js -o ./timeline_src/js/app.build.debug.js'));

gulp.task('timeline:jsugly', ()=>{
  return gulp.src(['./timeline-build/js/main.js', './timeline-build/js/calendar.js'])
    .pipe(lec())
    //.pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify().on('error', gutil.log))
    //.pipe(sourcemaps.write())
    .pipe(gulp.dest('./timeline/js/'));
});

gulp.task('timeline:js_debug_ugly', ()=>{
  return gulp.src([
      './timeline-build/js/main.js', './timeline-build/js/calendar.js'
      ])
      .pipe(lec())
      .pipe(gulp.dest('./timeline/js/'));
});

gulp.task('timeline:css', () => {
  return gulp.src([
      './timeline_src/scss/main.scss',
      './timeline_src/scss/html.scss',
      './timeline_src/scss/print.scss',
      './timeline_src/scss/svg.scss'
    ])
    .pipe(sass())
    .pipe(gulp.dest('./timeline/css'));
});

gulp.task('timeline:fonts', () => gulp.src('./timeline_src/fonts/*.*').pipe(gulp.dest('./timeline/fonts')));
gulp.task('timeline:img', () => gulp.src('./timeline_src/images/*.*').pipe(gulp.dest('./timeline/images')));
gulp.task('timeline:jslib', () => gulp.src('./timeline-build/js/libs/*.*').pipe(gulp.dest('./timeline/js/libs')));
gulp.task('timeline:html', () => gulp.src('./timeline-build/index.html').pipe(gulp.dest('./timeline')));
gulp.task('timeline:tpl', () => { gulp.src('./timeline-build/*.tpl').pipe(gulp.dest('./timeline')); gulp.src(['./timeline-build/views/**/*']).pipe(gulp.dest('./timeline/views'));  } );

// run release
gulp.task('timeline',
  gulpSequence(
    'timeline:clear', 'timeline:jsbuild',
    ['timeline:jsugly','timeline:jslib', 'timeline:css','timeline:fonts', 'timeline:img', 'timeline:html', 'timeline:tpl'],
    'timeline:clear'
  )
);
// run debug
gulp.task('timeline_debug', function(callback) {
    gulpSequence(
      'timeline:clear', 'timeline:jsbuild_debug',
      ['timeline:js_debug_ugly', 'timeline:jslib', 'timeline:css','timeline:fonts', 'timeline:img', 'timeline:html', 'timeline:tpl'],
      'timeline:clear'
    )(callback);
  }
);
gulp.task('timeline:watch', function(){
    watch(['./timeline_src/index.html','./timeline_src/js/**/*.js','./timeline_src/scss/**/*.scss'], function(event, cb) {
        gulp.start('timeline_debug');
    });
});


///--------------------------------------------------------------------------------------
/// crm
///--------------------------------------------------------------------------------------
gulp.task('crm', function () {
  var scripts = ['app.js', 'clientcard.js'];
  var paths = {
    'src' : 'static/scripts/crm/src/',
    'build' : 'static/scripts/crm/build/'
  };
  scripts.map(function(scr){
    var b = browserify({
      entries: paths.src + scr,
      transform: [node_underscorify],
      debug: true
    });
    return b.bundle()
    .pipe(source('./'+scr))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
        // Add transformation tasks to the pipeline here.
        //.pipe(uglify())
        .on('error', gutil.log)
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(paths.build));
  });
});
gulp.task('crm:watch', function(){
  watch(['static/scripts/crm/src/**/*.js','static/scripts/crm/src/**/*.html'], function(event, cb) {
      gulp.start('javascript');
  });
});


///--------------------------------------------------------------------------------------
/// Contracts Outgoing
///--------------------------------------------------------------------------------------
gulp.task('contratcs_outgoing', function () {
    var path_src = 'static/scripts/report/src/';
    var path_build = 'static/scripts/report/build/';
  ['app.js'].map(function(scr){
    var b = browserify({
      entries: path_src + scr,
      transform: [node_underscorify],
      debug: true
    });
    return b.bundle()
    .pipe(source('./'+scr))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
        // Add transformation tasks to the pipeline here.
        //.pipe(uglify())
        .on('error', gutil.log)
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(path_build));
  });
});

///--------------------------------------------------------------------------------------
/// Contracts Incoming
///--------------------------------------------------------------------------------------
gulp.task('contratcs_incoming', function () {
    var path_src = 'static/scripts/incoming/src/';
    var path_build = 'static/scripts/incoming/build/';
  ['app.js'].map(function(scr){
    var b = browserify({
      entries: path_src + scr,
      transform: [node_underscorify],
      debug: true
    });
    return b.bundle()
    .pipe(source('./'+scr))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
        // Add transformation tasks to the pipeline here.
        //.pipe(uglify())
        .on('error', gutil.log)
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(path_build));
  });
});

