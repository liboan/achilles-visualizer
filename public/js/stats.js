function getMean(values) { //finds mean
	var total = 0;
	for (var i = 0; i < values.length; i++) {
		if (values[i] !== null) {
			total += values[i]};
		}
	return total/values.length;
}

function getStdDev(values) { //sample stddev
	var mean = getMean(values);
	var sigmaMeanDiffSquared = 0;
	for (var i = 0; i < values.length; i++) {
		sigmaMeanDiffSquared += Math.pow(values[i] - mean, 2);
	};
	return Math.pow(sigmaMeanDiffSquared/(values.length - 1),0.5);
}

function zScore(values) {
	var mean = getMean(values);
	var stddev = getStdDev(values);

	var zScoreVals = [];

	for (var i = 0; i < values.length; i++) {
		zScoreVals.push((values[i] - mean)/stddev);
	}
	return zScoreVals;
}