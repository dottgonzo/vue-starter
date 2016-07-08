var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');

var tsProject = ts.createProject('tsconfig.json');

gulp.task('build', function () {
    var tsResult = tsProject.src() // instead of gulp.src(...)

        .pipe(ts(tsProject, {
            sortOutput: true,
					   }));

    return tsResult
        .pipe(gulp.dest('src'));
});