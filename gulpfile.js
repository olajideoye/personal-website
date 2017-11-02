/* Import our Node.js modules */
const gulp = require('gulp'),
    cssmin = require('gulp-cssmin'),
    environments = require('gulp-environments'),
    gulpif = require('gulp-if'),
    imagemin = require('gulp-imagemin'),
    less = require('gulp-less'),
    sass = require('gulp-sass'),
    postcss = require('gulp-postcss'),
    rename = require('gulp-rename'),
    rimraf = require('rimraf'),
    sourcemaps = require('gulp-sourcemaps'),
    path = require('path'),
    livereloadServer = require('gulp-server-livereload'),
    inlinesource = require('gulp-inline-source'),
    config = require('./gulpfile-config');


/* Declare our environments */
const development = environments.development,
    staging = environments.make('staging'),
    production = environments.production;

/* Set gulp.series and gulp.parallel to constants for convenience sake */
const series = gulp.series,
    parallel = gulp.parallel;

/* Extract some config properties for convenience */
const shouldAddSourcemaps = config.sourcemaps,
    shouldMinify = config.minify;


/* Declare our gulp tasks */
gulp.task('build', series(clean, parallel(styles, scripts, views, images, publicAssets), inlineViewSources));
gulp.task('default', series('build', parallel(watch, server)));

/* Describe our gulp tasks */
gulp.task('build').description = 'Clean out the build folder then compile styles, minify images, and copy assets into the build folder';
gulp.task('default').description = 'Run the build task and watch for any changes';


function clean(done) {
    rimraf(config.buildDir, done);
}
clean.description = 'Cleans the build folder';

function views() {
    let vConfig = config.views,
        files = vConfig.sourceFiles,
        dest = vConfig.destinationDir;

    return copy(files, dest);
}
views.description = 'Copy the view files to the public folder';


function inlineViewSources(done) {
    const buildDir = config.buildDir;

    if (config.minify) {
        return gulp.src(path.join(buildDir, '**/*.html'))
                .pipe(inlinesource())
                .pipe(gulp.dest(buildDir));
    } else {
        done();
    }
}
inlineViewSources.description = 'Inlines all CSS, JS and images on a page with the inline attribute';


function scripts() {
    return copy(config.scripts.sourceFiles, config.scripts.destinationDir);
}
scripts.description = 'Copy the script files to the public folder';


function styles() {
    let sConfig = config.styles,
        files = sConfig.sourceFiles,
        source = sConfig.sourceDir,
        dest = sConfig.destinationDir,
        mapsDir = sConfig.mapsDir,
        postcssConfig = sConfig.postcss;

    return compileSass(source, dest, files, mapsDir, postcssConfig);
}
styles.description = 'Compiles SCSS files to CSS; adds source maps if specified';


function minifyStyles(done) {
    if (shouldMinify) {
        let dir = config.styles.destinationDir;
        return minifyCSS(dir, dir, false);
    }
    done();
}
minifyStyles.description = 'Minify CSS files';


function server(done) {
    if (development()) {
        return gulp.src(config.buildDir)
            .pipe(livereloadServer({
                livereload: true,
                port: 5000,
                directoryListing: false,
                fallback: 'index.html',
                open: true,
            }));
    }
    else {
        done();
    }
}

function publicAssets() {
    let aConfig = config.publicAssets,
        files = aConfig.sourceFiles,
        dest = aConfig.destinationDir;

    return copy(files, dest);
}
publicAssets.description = 'Copy public assets from the app into the build folder';


function images() {
    let iConfig = config.images,
        sourceDir = iConfig.sourceDir,
        destDir = iConfig.destinationDir;

    return minifyImages(sourceDir, destDir);
}
images.description = 'Minify images back into the same (source) folder';


function watch(done) {
    if (development()) {
        gulp.watch(config.styles.sourceFiles, styles);
        gulp.watch(config.scripts.sourceFiles, scripts);
        gulp.watch(config.images.sourceFiles, images);
        gulp.watch(config.publicAssets.sourceFiles, publicAssets);
        gulp.watch(config.views.sourceFiles, views);
    }
    done();
}
watch.description = 'Watch relevant files and re-run their tasks (only in development environment)';


/**
 * Generic function to compile LESS files
 * @param {String} sourceDir a string representing the path to the directory for the LESS files
 * @param {String} destDir a string representing the path to the directory where the compiled files would be saved
 * @param {String|Array} files string or array of strings representing the glob match for the source files
 * @param {String} mapsDir the directory where sourcemaps would be stored (relative to the destination directory)
 * @param {Array} postcssConfig an array of postcss processors
 * @returns {*} the gulp stream
 */
function compileLess(sourceDir, destDir, files, mapsDir, postcssConfig) {
    return compileStyles(sourceDir, destDir, files, mapsDir, less, postcssConfig);
}

/**
 * Generic function to compile Sass files
 * @param {String} sourceDir a string representing the path to the directory for the Sass files
 * @param {String} destDir a string representing the path to the directory where the compiled files would be saved
 * @param {String|Array} files string or array of strings representing the glob match for the source files
 * @param {String} mapsDir the directory where sourcemaps would be stored (relative to the destination directory)
 * @param {Array} postcssConfig an array of postcss processors
 * @returns {*} the gulp stream
 */
function compileSass(sourceDir, destDir, files, mapsDir, postcssConfig) {
    return compileStyles(sourceDir, destDir, files, mapsDir, function () {
        return sass().on('error', sass.logError);
    }, postcssConfig);
}

/**
 * A generic function to compile both LESS and Sass files
 * @param {String} sourceDir a string representing the path to the directory for the source files
 * @param {String} destDir a string representing the path to the directory where the compiled files would be saved
 * @param {String|Array} files string or array of strings representing the glob match for the source files
 * @param {String} mapsDir the directory where sourcemaps would be stored (relative to the destination directory)
 * @param {Function} buildFxn the build function to use. could be less or sass functions
 * @param {Array} postcssConfig an array of postcss processors
 */
function compileStyles(sourceDir, destDir, files, mapsDir, buildFxn, postcssConfig) {
    return gulp.src(files, {base: sourceDir})
        .pipe(gulpif(shouldAddSourcemaps, sourcemaps.init()))
        .pipe(buildFxn())
        .pipe(postcss(postcssConfig))
        .pipe(gulpif(shouldAddSourcemaps, sourcemaps.write(mapsDir)))
        .pipe(gulp.dest(destDir));
}

/**
 * A generic function to copy files/directories to a different directory
 * @param {String|Array} source a string or array of string representing the glob match for the source files/folders
 * @param {String} destination the new directory to copy
 */
function copy(source, destination) {
    return gulp.src(source)
        .pipe(gulp.dest(destination));
}


/**
 * Generic function to minify CSS files
 * @param {String} sourceDir a string representing the path to the directory for the source files
 * @param {String} destDir a string representing the path to the directory where the minified files would be saved
 * @param {Boolean} shouldRename determine whether the new file should be renamed or not
 * @returns {*} the gulp stream
 */
function minifyCSS(sourceDir, destDir, shouldRename) {
    let files = [path.join(sourceDir, '**/*.css'), path.join('!' + sourceDir, '**/*.min.css')];
    return minify(files, destDir, cssmin, shouldRename);
}

/**
 * A generic function to minify images
 * @param {string} sourceDir a string representing the path to the directory for the source files
 * @param {string} destDir a string representing the path to the directory where the minified files would be saved
 * @returns {*} the gulp stream
 */
function minifyImages(sourceDir, destDir) {
    let files = path.join(sourceDir, '**/*');
    return minify(files, destDir, imagemin, false);
}

/**
 * A generic function to minify different types of files
 * @param {String|Array} source a string or array of strings representing the glob match for the source files/folders
 * @param {String} destDir a string representing the path to the directory where the minified files would be saved
 * @param {Function} minifyFxn the minify function to use
 * @param {Boolean} shouldRename determine whether the new file should be renamed or not
 */
function minify(source, destDir, minifyFxn, shouldRename) {
    if ('undefined' === typeof shouldRename) {
        shouldRename = true;
    }
    return gulp.src(source)
        .pipe(minifyFxn())
        .pipe(gulpif((shouldRename), rename({suffix: '.min'})))
        .pipe(gulp.dest(destDir));
}
