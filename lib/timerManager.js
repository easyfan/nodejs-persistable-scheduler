var timerMap = {};
var id = 0;

var hitch = require('./utils').hitch;

executeTimer = function(param)
{
	if (param && param.func != undefined && param.id != undefined)
	{
		param.func();
		console.log("timerManager.executeTimer: registered function for timer:$id executed.".replace('$id',param.id));
		// .then(function(result) {
		// 	console.log("In timerManager.executeTimer: function for timerID:$timerID executed successfully.".replace('$timerID',param.id));
		// }, function(err) {
		// 	console.log("In timerManager.executeTimer: function for timerID:$timerID executed failed.".replace('$timerID',param.id));
		// 	console.log(err);
		// });
	}
	else
	{
		console.log("timerManager.executeTimer: registered function for timer:$id did not executed.".replace('$id',param.id));
	}
};

exports.assignTimer = function(func,timeout)
{
	console.log("exports.assignTimer:timeout"+ timeout);
	id += 1;
	var param = {
		func:func,
		id:id
	};

	timerMap[id] = setTimeout(hitch(executeTimer,param),timeout);
	return id;
};

exports.cancelTimer = function(id)
{
	if (timerMap[id])
	{
		clearTimeout(timerMap[id]);
		delete timerMap[id];
		return true;
	}
	else
		return false;
};