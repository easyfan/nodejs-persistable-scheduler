var dateUtil = require('./dateUtil');
var queryAdapter = require('./queryAdapter');
var taskStatus = require('./taskStatus').code;
var recordType = require('./recordType').code;
var taskFrequecy = require('./taskFrequecy').code;
//var methods = require('./taskMethods').methods;
//var methodNameMap = require('./taskMethods').methodNameMap;
var taskMethods = require('./taskMethods');
var timerManager = require('./timerManager');
var Q = require('q');
var hitch = require('./utils').hitch;

var MONITOR_SCAN_FREQUENCY = 24 * 60 * 60 * 1000; //1 day by default;
var MINMUM_TIME_INTERVAL = 30 * 60 * 1000;//30 Minutes by default;

setScanInterval = function(interval) 
{
	if (interval > MINMUM_TIME_INTERVAL)
		MONITOR_SCAN_FREQUENCY = interval;
};

setToBeStatus = function(taskID,status)
{
	var defer = Q.defer();
	var sql = 'UPDATE fixtimetask SET toBeStatus = $status WHERE taskID = $taskID'.replace('$status',status).replace('$taskID',taskID);
	queryAdapter.query(sql).then(function(results) {
		defer.resolve(true);
	}, function(err) {
		console.log("in taskUtil.setToBeStatus, fail to set task:$taskID to be status:$status.".replace('$status',status).replace('$taskID',taskID));
		console.log(err);
		defer.reject(err);
	});
	return defer.promise;
};

dealToBeStatus = function(param) {
	var defer = Q.defer();
	if (param.toBeStatus != null && (param.toBeStatus == taskStatus["faint"] || param.toBeStatus == taskStatus["cancel"]))
	{	
		var sql = null;
		var isDel = false;
		if (param.toBeStatus == taskStatus["faint"])
		{
			sql = 'UPDATE fixtimetask SET taskStatus = $status, toBeStatus = NULL WHERE taskID = $taskID'.replace('$status',param.toBeStatus).replace('$taskID',param.taskID);
		}
		else
		{
			sql = 'DELETE FROM fixtimetask WHERE taskID = $taskID'.replace('$taskID',param.taskID);
			isDel = true;
		}
		queryAdapter.query(sql).then(function(results) {
			defer.resolve(isDel);
		}, function(err) {
			console.log("in taskUtil.dealToBeStatus, fail to deal task:$taskID to be status:$status.".replace('$status',param.toBeStatus).replace('$taskID',param.taskID));
			console.log(err);
			defer.reject(err);
		});
	}
	else
	{
		defer.resolve(false);
	}
	return defer.promise;
};

doTaskByTimer = function (param) {
	var d = new Date();
	param.executeDate = dateUtil.utcDateRefine(param.executeDate);
	//console.log("In taskUtil.doTaskByTimer, now: $d1, executeDate:$d2".replace('$d1',d).replace('$d2',param.executeDate));
	var sql = 'UPDATE fixtimetask SET taskStatus = $status WHERE taskID = $taskID'.replace('$status',taskStatus["run"]).replace('$taskID',param.taskID);
	queryAdapter.query(sql).then(function(results) {
		console.log("In taskUtil.doTaskByTimer, UPDATE START for task:$taskID in fixtimetask successfully.".replace('$taskID',param.taskID));
		taskMethods.getMethodByID(param.executeMethod)(param).then(function(result) {
			//TODO: In the future, we may need to care about the result value is true or false...
			console.log("In taskUtil.doTaskByTimer, task:$taskID in fixtimetask execute method:$method successfully.".replace('$taskID',param.taskID).replace('$method',param.executeMethod));
			var added = null;
			//As the frequency maybe changed by taskUtil.changeFrequency while executing, we need to retrieve the frequency from DB again.
			sql = 'SELECT * FROM fixtimetask WHERE taskID = $taskID'.replace('$taskID',param.taskID);
			queryAdapter.query(sql).then(function(results) {
				if (results.length != 1)
				{
					console.log("In taskUtil.doTaskByTimer, QUERY task:$taskID in fixtimetask failed.".replace('$taskID',param.taskID));
				}
				else
				{
					if (results[0].fequency != taskFrequecy["none"])
					{
						switch (results[0].fequency)
						{
							case taskFrequecy["fixinterval"]:
								//add = dateUtil.IntervalToParameter(param.intervalTime);
								added = dateUtil.dateAdd(param.executeDate,param.intervalTime);
							break;
							case taskFrequecy["annually"]:
								added = dateUtil.dateAddYears(param.executeDate,1);
							break;
							case taskFrequecy["semiannually"]:
								added = dateUtil.dateAddMonths(param.executeDate,6);
							break;
							case taskFrequecy["seasonly"]:
								added = dateUtil.dateAddMonths(param.executeDate,3);
							break;
							case taskFrequecy["monthly"]:
								added = dateUtil.dateAddMonths(param.executeDate,1);
							break;
							case taskFrequecy["semimonthly"]:
								added = dateUtil.dateAddDays(param.executeDate,15);
							break;
							case taskFrequecy["weekly"]:
								added = dateUtil.dateAddDays(param.executeDate,7);
							break;
							case taskFrequecy["semiweekly"]:
								added = dateUtil.dateAddDays(param.executeDate,4);
							break;
							case taskFrequecy["daily"]:
								added = dateUtil.dateAddDays(param.executeDate,1);
							break;
							case taskFrequecy["semidaily"]:
								added = dateUtil.dateAddHours(param.executeDate,12);
							break;
							case taskFrequecy["hourly"]:
								added = dateUtil.dateAddHours(param.executeDate,1);
							break;
							case taskFrequecy["halfhourly"]:
								added = dateUtil.dateAddMinutes(param.executeDate,30);
							break;
							default:
							break;
						}
						var timerID = null;
						//console.log("in taskUtil.doTaskByTimer, param.executeDate = "+param.executeDate);
						//var newD = 
						//var newD = dateUtil.toJSDate(dateUtil.addTime(param.executeDate,add.year,add.month,add.day,add.hour,add.minute,add.sec));
						//console.log(newD);
						var evaluatedResult = evaluateTaskTime(added);
						if (evaluatedResult.status == taskStatus["awake"] || evaluatedResult.status == taskStatus["run"])
						{
							results[0].taskStatus = evaluatedResult.status;
							results[0].executeDate = added;
							console.log("in taskUtil.doTaskByTimer, evaluatedResult.timeDiff = "+evaluatedResult.timeDiff);
							timerID = timerManager.assignTimer(hitch(doTaskByTimer,results[0]), evaluatedResult.timeDiff==null?5000:evaluatedResult.timeDiff);
						}
						sql = 'UPDATE fixtimetask SET taskStatus = $status, executeDate = $date1, lastExecuteDate = $date2, timerID = $timerID WHERE taskID = $taskID'
						.replace('$status',evaluatedResult.status).replace('$date1',dateUtil.dateToString(added)).replace('$date2',dateUtil.dateToString(d)).replace('$timerID',timerID).replace('$taskID',param.taskID);
					}
					else
					{
						sql = 'DELETE FROM fixtimetask WHERE taskID = $taskID'.replace('$taskID',param.taskID);
					}
					queryAdapter.query(sql).then(function(results) {
						console.log("In taskUtil.doTaskByTimer, UPDATE END for task:$taskID in fixtimetask successfully.".replace('$taskID',param.taskID));
					}, function(err) {
						//console.log(sql);
						console.log("In taskUtil.doTaskByTimer, UPDATE END for task:$taskID in fixtimetask failed.".replace('$taskID',param.taskID));
						console.log(err);
					});
				}
			}, function(err) {
				console.log("In taskUtil.doTaskByTimer, QUERY task:$taskID in fixtimetask failed.".replace('$taskID',param.taskID));
				console.log(err);
			});
			
		},function(err) {
			console.log("In taskUtil.doTaskByTimer, task:$taskID in fixtimetask execute method:$method failed.".replace('$taskID',param.taskID).replace('$method',param.executeMethod));
		});

	}, function(err) {
		console.log("In taskUtil.doTaskByTimer, UPDATE START for task:$taskID in fixtimetask successfully.".replace('$taskID',param.taskID));
		console.log(err);
	});
};

custom_initialTasks = function()
{
	var defer = Q.defer();
	var sql = 'SELECT * FROM scanrecord WHERE recordType = $recordType ORDER BY recordDate'.replace('$recordType',recordType['custom_initial']);
	queryAdapter.query(sql).then(function(results) {
		var isDone = false;
		var isStarted = false;
		var isFinished = false;
		var matchCode = null;
		var isMatch = false;
		if (results.length == 2 && 
			((results[0].matchCode == -1 && results[1].matchCode == results[0].recordID) || 
			(results[1].matchCode == -1 && results[0].matchCode == results[1].recordID)))
		{
			//Doing nothing...
			defer.resolve(true);
		}

		else
		{
			if (taskMethods.getInitialMethod())
			{
				createRecord(recordType['custom_initial'],null).then(function(id) {
					//console.log(taskMethods.getInitialMethod());
					console.log("In taskUtil.custom_initialTasks, create task start custom_initial record:$recordID in scanrecord successfully.".replace('$recordID',id));
					taskMethods.getInitialMethod()().then(function(result) {
						createRecord(recordType['custom_initial'],id).then(function(recordID) {
							defer.resolve(true);
							console.log("In taskUtil.custom_initialTasks, create finish custom_initial record:$recordID in scanrecord successfully.".replace('$recordID',recordID));
							
						},function(err) {
							console.log("In taskUtil.custom_initialTasks, create finish custom_initial record in scanrecord failed.");
							console.log(err);
							defer.reject(err);
						});
					}, function(err) {
						console.log("In taskUtil.custom_initialTasks, execute initial function failed.");
						console.log(err);
						defer.reject(err);
					})
				},function(err) {
					console.log("In taskUtil.custom_initialTasks, create start custom_initial record in scanrecord failed.");
					console.log(err);
					defer.reject(err);
				});
			}
			else
			{
				console.log("In taskUtil.custom_initialTasks, no initial function assigned.");
				defer.resolve(false);
			}
			
		}
		
	}, function(err) {
		console.log("In taskUtil.custom_initialTasks, query custom_initial task in scanrecord failed.");
		console.log(err);
		defer.reject(err);
	});

	return defer.promise;
};

sys_initialTasks = function()
{
	console.log("In taskUtil.sys_initialTasks start");
	var defer = Q.defer();
	var sql = "SHOW TABLES";
	var fixtimetaskCreated = false;
	var scanrecordCreated = false;
	queryAdapter.query(sql).then(function(tables) {
		tables.forEach(function(table) {
			var keys = Object.keys(table);
			keys.forEach(function(key) {
				if (table[key] == 'fixtimetask')
					fixtimetaskCreated = true;
				else if(table[key] == 'scanrecord')
					scanrecordCreated = true;
			});
		});

		if (fixtimetaskCreated && scanrecordCreated)
		{
			defer.resolve(true);
		}
		else if (!fixtimetaskCreated)
		{
			sql = "CREATE TABLE fixtimetask(\
				taskID INT PRIMARY KEY AUTO_INCREMENT,\
				executeDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\
				fequency INT NOT NULL DEFAULT 0,\
				intervalTime INT DEFAULT NULL,\
				executeMethod INT NOT NULL,\
				parameter INT DEFAULT NULL,\
				taskStatus INT NOT NULL DEFAULT 0,\
				toBeStatus INT DEFAULT NULL,\
				timerID INT DEFAULT NULL,\
				lastExecuteDate TIMESTAMP DEFAULT 0\
				)ENGINE=InnoDB;"
			queryAdapter.query(sql).then(function(results) {
				if (!scanrecordCreated)
				{
					sql = "CREATE TABLE scanrecord(\
						recordID INT PRIMARY KEY AUTO_INCREMENT,\
						matchCode INT NOT NULL DEFAULT -1,\
						recordType INT NOT NULL,\
						recordDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP\
						)ENGINE=InnoDB;"
					queryAdapter.query(sql).then(function(results) {
						// createRecord(recordType['sys_initial'],id).then(function(recordID) {
						 	console.log("In taskUtil.sys_initialTasks, create finish sys_initial record in scanrecord successfully.");
							defer.resolve(true);
						// },function(err) {
						// 	console.log("In taskUtil.sys_initialTasks, create finish sys_initial record in scanrecord failed.");
						// 	console.log(err);
						// });
					},function(err) {
						console.log("In taskUtil.sys_initialTasks, create DB scanrecord failed.");
						console.log(err);
						defer.reject(err)
					})
				}
				
			},function(err) {
				console.log("In taskUtil.sys_initialTasks, create DB fixtimetask failed.");
				console.log(err);
				defer.reject(err)
			});
		}
		else if (!scanrecordCreated)
		{
			sql = "CREATE TABLE scanrecord(\
				recordID INT PRIMARY KEY AUTO_INCREMENT,\
				matchCode INT NOT NULL DEFAULT -1,\
				recordType INT NOT NULL,\
				recordDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP\
				)ENGINE=InnoDB;"
			queryAdapter.query(sql).then(function(results) {
				// createRecord(recordType['sys_initial'],id).then(function(recordID) {
				 	console.log("In taskUtil.sys_initialTasks, create finish sys_initial record in scanrecord successfully.");
					defer.resolve(true);
				// },function(err) {
				// 	console.log("In taskUtil.sys_initialTasks, create finish sys_initial record in scanrecord failed.");
				// 	console.log(err);
				// });
			},function(err) {
				console.log("In taskUtil.sys_initialTasks, create DB scanrecord failed.");
				console.log(err);
				defer.reject(err)
			})
		}

	},function(err){
		console.log("In taskUtil.sys_initialTasks show tables failed");
		console.log(err);
		defer.reject(err)
	});		

	return defer.promise;
	// var sql = 'SELECT * FROM scanrecord WHERE recordType = $recordType ORDER BY recordDate'.replace('$recordType',recordType['sys_initial']);
	// queryAdapter.query(sql).then(function(results) {
	// 	var isDone = false;
	// 	var isStarted = false;
	// 	var isFinished = false;
	// 	var matchCode = null;
	// 	var isMatch = false;
	// 	if (results.length == 2 && 
	// 		((results[0].matchCode == -1 && results[1].matchCode == results[0].recordID) || 
	// 		(results[1].matchCode == -1 && results[0].matchCode == results[1].recordID)))
	// 	{
	// 		//Doing nothing...
	// 	}

	// 	else
	// 	{
	// 		createRecord(recordType['sys_initial'],null).then(function(id) {
	// 			//console.log(taskMethods.getInitialMethod());
	// 			console.log("In taskUtil.sys_initialTasks, create task start sys_initial record:$recordID in scanrecord successfully.".replace('$recordID',id));
	// 			sql = "CREATE TABLE fixtimetask(\
	// 				taskID INT PRIMARY KEY AUTO_INCREMENT,\
	// 				executeDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\
	// 				fequency INT NOT NULL DEFAULT 0,\
	// 				intervalTime INT DEFAULT NULL,#in second\
	// 				executeMethod INT NOT NULL,\
	// 				parameter INT DEFAULT NULL,\
	// 				taskStatus INT NOT NULL DEFAULT 0,\
	// 				toBeStatus INT DEFAULT NULL,\
	// 				timerID INT DEFAULT NULL,\
	// 				lastExecuteDate TIMESTAMP DEFAULT 0\
	// 				)ENGINE=InnoDB;"
	// 			queryAdapter.query(sql).then(function(results) {
	// 				sql = "CREATE TABLE scanrecord(\
	// 					recordID INT PRIMARY KEY AUTO_INCREMENT,\
	// 					matchCode INT NOT NULL DEFAULT -1,\
	// 					recordType INT NOT NULL,\
	// 					recordDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP\
	// 					)ENGINE=InnoDB;"
	// 				queryAdapter.query(sql).then(function(results) {
	// 					createRecord(recordType['sys_initial'],id).then(function(recordID) {
	// 						console.log("In taskUtil.sys_initialTasks, create finish sys_initial record:$recordID in scanrecord successfully.".replace('$recordID',recordID));
							
	// 					},function(err) {
	// 						console.log("In taskUtil.sys_initialTasks, create finish sys_initial record in scanrecord failed.");
	// 						console.log(err);
	// 					});
	// 				},function(err) {
	// 					console.log("In taskUtil.sys_initialTasks, create DB scanrecord failed.");
	// 					console.log(err);
	// 				})
	// 			},function(err) {
	// 				console.log("In taskUtil.sys_initialTasks, create DB fixtimetask failed.");
	// 				console.log(err);
	// 			});
	// 		},function(err) {
	// 			console.log("In taskUtil.sys_initialTasks, create start sys_initial record in scanrecord failed.");
	// 			console.log(err);
	// 		});
	// 	}
		
	// }, function(err) {
	// 	console.log("In taskUtil.sys_initialTasks, query sys_initial task in scanrecord failed.");
	// 	console.log(err);
	// });
};

fallbackTasks = function()
{
	var sql = 'SELECT * FROM scanrecord WHERE recordType = $recordType ORDER BY recordDate'.replace('$recordType',recordType['common']);
	queryAdapter.query(sql).then(function(results) {
		var isFinished = false;
		var matchCodes = {};
		var param = {isFallback:true};
		results.forEach(function(result) {
			if (result.matchCode == -1) //The start record
			{
				if (matchCodes[result.recordID])
					delete matchCodes[result.recordID];
				else 
					matchCodes[result.recordID] = 1;
			}
			else
			{
				if (matchCodes[result.matchCode])
					delete matchCodes[result.matchCode];
				else
					matchCodes[result.matchCode] = 1;
			}
		});
		var matchCodeArr = Object.keys(matchCodes);
		if (matchCodeArr.length == 0)
		{
			isFinished = true;
		}
		else if (matchCodeArr.length > 1)
			console.log("In taskUtil.fallbackTasks, Fatal error. matchCode: $matchCode deplicated $time times.".replace('$matchCode',matchCode).replace('$time',matchCodes[matchCode]));
		else
		{
			param['matchCode'] = matchCodeArr[0];
		}
		console.log("taskUtil.scanTask start");
		scanTask(param);
		console.log("taskUtil.scanTask end");
		
	}, function(err) {
		console.log("In taskUtil.fallbackTasks, query initial task in scanrecord failed.");
		console.log(err);
	});

};

watchTasks = function()
{
	var id = setInterval(hitch(scanTask,{isFallback:false}),MONITOR_SCAN_FREQUENCY);//Daily scan
	// console.log("in taskUtil.watchTasks:>>>>>>>>>>>>>>>>>>>>>");
	// console.log(id);
	// console.log("in taskUtil.watchTasks:<<<<<<<<<<<<<<<<<<<<<");
};

createRecord = function(type,code)
{
	console.log("taskUtil.createRecord start");
	var defer = Q.defer();
	var sql = 'INSERT INTO scanrecord (recordType) VALUES ($recordType)'.replace('$recordType',type);
	if (code != undefined && code != null)
		sql = 'INSERT INTO scanrecord (recordType,matchCode) VALUES ($recordType,$matchCode)'.replace('$recordType',type).replace('$matchCode',code);
	queryAdapter.query(sql).then(function(results) {
		if (results && results.insertId)
		{
			recordID = results.insertId;
			console.log("taskUtil.createRecord record scanTask start record into scanrecord as recordID: $recordID".replace('$recordID',recordID));
			defer.resolve(recordID);
		}
		else
		{
			defer.reject(false);
			console.log("taskUtil.createRecord record scanTask record into scanrecord error");
		}
	},function(err) {
		console.log("taskUtil.createRecord record scanTask record into scanrecord error");
		console.log(err);
		defer.reject(err);
	});
	console.log("taskUtil.createRecord end");
	return defer.promise;
};

getRecordID = function(param) {
	console.log("taskUtil.getRecordID start");
	var recordID = null;
	var isFallback = false;
	var defer = Q.defer();
	if (param && param['isFallback'])
	{
		console.log("taskUtil.getRecordID fallback");
		isFallback = true;
	} 
	if (param['matchCode'] != undefined && param['matchCode'] != null)
	{
		console.log(param);
		console.log("taskUtil.getRecordID: matchCode = $m".replace("$m",param['matchCode']));
		recordID = param['matchCode'];
		defer.resolve({recordID:recordID,isFallback:isFallback});

	}
	else
	{
		console.log("taskUtil.getRecordID start createRecord");
		createRecord(param.recordType).then(function(id) {
			console.log("taskUtil.getRecordID create Record:$id".replace("$id",id));
			recordID = id;
			defer.resolve({recordID:recordID,isFallback:isFallback});
		},function(err) {
			console.log("taskUtil.getRecordID: createRecord failed");
			console.log(err);
			defer.reject(err);
		});
	}
	console.log("taskUtil.getRecordID end");
	return defer.promise;
};

evaluateTaskTime = function(executeDate)
{
	var d = new Date();
	var status = taskStatus["faint"];
	var timeDiff = null;
	if (executeDate >= d)
	{
		var d2 = dateUtil.dateAdd(d,MONITOR_SCAN_FREQUENCY);
		if (executeDate <= d2)
		{
			status = taskStatus["awake"];
			timeDiff = executeDate-d;
			console.log("evaluateTaskTime timeDiffInMS: "+timeDiff);
			if (timeDiff < 5000)
				timeDiff = 5000;
			//register timer
		}
		else
		{
			status = taskStatus["sleep"];
		}

	}
	else
	{
		status = taskStatus["run"];
		//run method directly
	}
	return {status:status,timeDiff:timeDiff};
};

scanTask = function(param) {
	console.log("taskUtil.scanTask start inner");
	param.recordType = recordType['common'];
	getRecordID(param).then(function(pa) {
		console.log(pa);
		var isFallback = pa.isFallback;
		var recordID = pa.recordID;

		var sql = 'SELECT * FROM fixtimetask';
		queryAdapter.query(sql).then(function(results) {
			results.forEach(function(result) {
				dealToBeStatus(result).then(function(isDel) {
					if (isDel == false)
					{
						result.executeDate = dateUtil.utcDateRefine(result.executeDate);
						var evaluatedResult = evaluateTaskTime(result.executeDate);
						var timerID = null;
						console.log("in taskUtil.scanTask: >>>>>>>>>>>>>>>>>>");
						console.log(result.executeDate);
						console.log(evaluatedResult);
						console.log(pa);
						var dealIt = true;
						if (result.taskStatus == taskStatus["faint"])
						{
							dealIt = false;
						}
						if (result.taskStatus == taskStatus["cancel"])
						{
							console.log("in taskUtil.scanTask: something wrong, status of task:$taskID is 'cancel'??".replace('$taskID',result.taskID));
							dealIt = false;
						}
						if (isFallback && (result.taskStatus == taskStatus["run"] || result.taskStatus == taskStatus["awake"]))
						{
							timerID = timerManager.assignTimer(hitch(doTaskByTimer,result), evaluatedResult.timeDiff==null?5000:evaluatedResult.timeDiff);
							evaluatedResult.status = taskStatus["awake"];
						}
						else if (result.taskStatus == evaluatedResult.status)
						{
							dealIt = false;
						}
						else if ((result.taskStatus == taskStatus["awake"] || result.taskStatus == taskStatus["run"]) && result.timerID != null)
						{
							dealIt = false;
						}
						else if (result.taskStatus == taskStatus["sleep"])
						{
							if (evaluatedResult.status == taskStatus["awake"] || evaluatedResult.status == taskStatus["run"])
							{
								timerID = timerManager.assignTimer(hitch(doTaskByTimer,result), evaluatedResult.timeDiff==null?5000:evaluatedResult.timeDiff);
								evaluatedResult.status = taskStatus["awake"];
							}
						}
						//console.log(timerID);
						//console.log("in taskUtil.scanTask: <<<<<<<<<<<<<<<<<222");
						if (dealIt)
						{
							sql = 'UPDATE fixtimetask SET timerID = $timerID, taskStatus = $status WHERE taskID = $taskID'.replace('$timerID',timerID).replace('$status',evaluatedResult.status).replace('$taskID',result.taskID);
							queryAdapter.query(sql).then(function(results2) {
								//console.log("in taskUtil.scanTask: <<<<<<<<<<<<<<<<<");
								console.log("In taskUtil.scanTask, UPDATE record:$recordID in fixtimetask successfully.".replace('$recordID',result.taskID));
							},function(err) {
								console.log("In taskUtil.scanTask, UPDATE record:$recordID in fixtimetask failed.".replace('$recordID',result.taskID));
								console.log(err);
							});
						}
					}
				},function(err) {
					console.log("in taskUtil.scanTask, fail on dealToBeStatus with task:$taskID".replace('$taskID',result.taskID));
					console.log(err);
				});
				
			});
			createRecord(recordType['common'],recordID).then(function(pa) {
				console.log("In taskUtil.scanTask, create task finish record:$recordID in scanrecord successfully.".replace('$recordID',pa));
			},function(err) {
				console.log("In taskUtil.scanTask, create task finish record in scanrecord failed.");
				console.log(err);
			});
		}, function(err) {
			console.log("In taskUtil.scanTask, query from fixtimetask failed.");
			console.log(err);
		});
	},function(err) {
		console.log("In taskUtil.scanTask, query from fixtimetask failed.");
		console.log(err);
	});
};

/***********************************************************************************************************
**
**   All public methods as below:
**
**   startTasks:		For starting the task regirstration and maintain component;
**                  	No return;
**   registerTask:		For registering new task, the methodName should be registered in taskMethods.js;
**                  	By Q.defer.promise, return created taskID if succeed;
**   cancelTask:		For removing a specified task by task ID, will be derferred if task is running;
**                  	By Q.defer.promise, return true when cancel directly, false when deferred, if succeed;
**   pauseTask:			For pausing a repeat task by task ID, will be derferred if task is running;
**                  	By Q.defer.promise, return true when pause directly, false when deferred, if succeed;
**   restartTask:		For restarting a specified paused task by ID;
**                  	By Q.defer.promise, return true if succeed;
**   hastenTask: 		For hastening the next execution time of a specified task by task ID with a given hasten peried;
**						By Q.defer.promise, return true if succeed. Running task WILL NOT be hastened;
**   delayTask: 		For delaying the next execution time of a specified task by task ID with a given delay period;
**                  	By Q.defer.promise, return true if succeed. Running task WILL NOT be delayed;
**   changeFrequency: 	For changing the execution frequency of specified task by ID to a given frequency;
**                  	By Q.defer.promise, return true if succeed;
**
************************************************************************************************************/

exports.startTasks = startTasks = function()
{
	console.log("taskUtil.startTasks Started.");
	console.log("taskUtil.initialTasks Started.");
	sys_initialTasks().then(function(result){
		console.log("taskUtil.fallbackTasks Started.");
		fallbackTasks();
		console.log("taskUtil.fallbackTasks Ended.");
		custom_initialTasks().then(function(result){
			console.log("taskUtil.initialTasks Ended.");
			console.log("taskUtil.watchTasks Started.");
			watchTasks();
			console.log("taskUtil.watchTasks Ended.");
			console.log("taskUtil.startTasks Ended.");
		} , function(err) {
			console.log("taskUtil.initialTasks failed in taskUtil.custom_initialTasks.");
			console.log(err);
		});
		
	},function(err) {
		console.log("taskUtil.initialTasks failed in taskUtil.sys_initialTasks.");
		console.log(err);
	});
	
};


exports.registerTask = function(frequency,firstDate,methodName,param,intervalTime) {
	var defer = Q.defer();

	if (taskMethods.getMethodByName(methodName) == null)
	{
		console.log("In taskUtil.registerTask, FATAL ERROR: given parameter methodName:$methodName not registered in taskMethods.js.".replace('$methodName',methodName));
		defer.reject("Unregistered method name for registery.");
	}
	else if (taskFrequecy[frequency] == undefined)
	{
		console.log("In taskUtil.registerTask, FATAL ERROR: given parameter frequency:$frequency not registered in taskFrequecy.js.".replace('$frequency',frequency));
		defer.reject("Unregistered frequency type for registery.");
	}
	else if (frequency == "fixinterval" && (!intervalTime || intervalTime < MINMUM_TIME_INTERVAL))
	{
		console.log("In taskUtil.registerTask, FATAL ERROR: given parameter frequency = none whihout giving available intervalTime.");
		defer.reject("Frequency = none whihout giving available intervalTime.");
	}
	else
	{
		var timerID = null;
		var evaluatedResult = evaluateTaskTime(firstDate);
		//console.log("<<<<<<<<<<<<<<<<<<<<<");
		//console.log(evaluatedResult);
		//console.log(">>>>>>>>>>>>>>>>>>>>>");
		var sql = 'INSERT INTO fixtimetask (executeMethod, fequency, taskStatus, executeDate, parameter $intervalTimeName) VALUES ($executeMethod, $fequency, $status, $date1,$param $intervalTimeValue)'
		.replace('$executeMethod',taskMethods.getIDByName(methodName)).replace('$fequency',taskFrequecy[frequency]).replace('$status',evaluatedResult.status).replace('$date1',dateUtil.dateToString(firstDate)).replace('$param',param)
		.replace('$intervalTimeName',intervalTime?', intervalTime':'').replace('$intervalTimeValue',intervalTime?', '+intervalTime:'');
		//console.log(sql);
		queryAdapter.query(sql).then(function(results) {
			if (results && results.insertId)
			{
				console.log("In taskUtil.registerTask, INSERT task:$taskID INTO fixtimetask successfully.".replace('$taskID',results.insertId));
				if (evaluatedResult.status == taskStatus["awake"] || evaluatedResult.status == taskStatus["run"])
				{
					sql = 'SELECT * FROM fixtimetask WHERE taskID = ' + results.insertId;
					queryAdapter.query(sql).then(function(results2) {
						if (results2 && results2.length == 1)
						{
							console.log("In taskUtil.registerTask, query taskID:$taskID from fixtimetask successfully.".replace('$taskID',results.insertId));
							var timerID = timerManager.assignTimer(hitch(doTaskByTimer,results2[0]), evaluatedResult.timeDiff==null?5000:evaluatedResult.timeDiff);
							console.log(timerID);
							sql = 'UPDATE fixtimetask SET timerID = $timerID WHERE taskID = $taskID'.replace('$timerID',timerID).replace('$taskID',results2[0].taskID);
							queryAdapter.query(sql).then(function(results3) {
								console.log("In taskUtil.registerTask, UPDATE taskID:$taskID SET timerID:$timerID from fixtimetask successfully.".replace('$timerID',timerID).replace('$taskID',results2[0].taskID));
								defer.resolve(results.insertId);
							}, function(err) {
								console.log("In taskUtil.registerTask, UPDATE taskID:$taskID SET timerID:$timerID from fixtimetask failed.".replace('$timerID',timerID).replace('$taskID',results2[0].taskID));
								console.log(err);
								defer.reject(err);
							});
						}
						else
						{
							console.log("In taskUtil.registerTask, query taskID:$taskID from fixtimetask failed.".replace('$taskID',results.insertId));
							defer.reject("In taskUtil.registerTask, query taskID:$taskID from fixtimetask failed.".replace('$taskID',results.insertId));
						}
					}, function(err) {
						console.log("In taskUtil.registerTask, query taskID:$taskID from fixtimetask failed.".replace('$taskID',results.insertId));
						console.log(err);
						defer.reject(err);
					});
				}
				else
				{
					defer.resolve(results.insertId);
				}
			}
		}, function(err) {
			console.log("In taskUtil.registerTask, INSERT task INTO fixtimetask failed.");
			console.log(err);
			defer.reject(err);
		});
	}
	return defer.promise;
};

exports.cancelTask = function(taskID) {

	var defer = Q.defer();

	var sql = 'SELECT * from fixtimetask WHERE taskID = $taskID'.replace('$taskID',taskID);
	queryAdapter.query(sql).then(function(results) {
		if (results.length == 0)
		{
			console.log("In taskUtil.cancelTask, QUERY task:$taskID in fixtimetask failed, taskID not found.".replace('$taskID',taskID));
			defer.reject("In taskUtil.cancelTask, QUERY task:$taskID in fixtimetask failed, taskID not found.".replace('$taskID',taskID));
		}
		else
		{
			if (results[0].taskStatus == taskStatus["run"])
			{
				setToBeStatus(taskID,taskStatus["cancel"]).then(function(result) {
					console.log("In taskUtil.cancelTask, DELETE $taskID in fixtimetask will be deferred, as task is running".replace('$taskID',taskID));
					defer.resolve(false);
				},function(err) {
					console.log("In taskUtil.cancelTask, setToBeStatus task:$taskID failed.".replace('$taskID',taskID));
					defer.reject(err);
				});
			}
			else
			{
				console.log("In taskUtil.cancelTask, QUERY task:$taskID in fixtimetask successfully.".replace('$taskID',taskID));
				if (results[0].taskStatus == taskStatus["awake"] && results[0].timerID != null)
				{
					timerManager.cancelTimer(results[0].timerID);
				}
				sql = 'DELETE FROM fixtimetask WHERE taskID = $taskID'.replace('$taskID',taskID);
				queryAdapter.query(sql).then(function(results) {
					console.log("In taskUtil.cancelTask, DELETE $taskID in fixtimetask successfully.".replace('$taskID',taskID));
					defer.resolve(true);
				},function(err) {
					console.log("In taskUtil.cancelTask, DELETE $taskID in fixtimetask failed.".replace('$taskID',taskID));
					console.log(err);
					defer.reject(err);
				});
			}
		}
	},function(err) {
		console.log("In taskUtil.cancelTask, QUERY task:$taskID in fixtimetask failed.".replace('$taskID',taskID));
		console.log(err);
		defer.reject(err);
	});

	return defer.promise;
};

exports.pauseTask = function(taskID) {
	var defer = Q.defer();
	var sql = 'SELECT * from fixtimetask WHERE taskID = $taskID'.replace('$taskID',taskID);
	queryAdapter.query(sql).then(function(results) {
		if (results.length != 1)
		{
			console.log("In taskUtil.pauseTask, QUERY task:$taskID in fixtimetask failed.".replace('$taskID',taskID));
			defer.reject(false);
		}
		else if (results[0].taskStatus == taskStatus["run"])
		{
			setToBeStatus(taskID,taskStatus["faint"]).then(function(result) {
				console.log("In taskUtil.pauseTask, pause task:$taskID in fixtimetask will be deferred, as task is running".replace('$taskID',taskID));
				defer.resolve(false);
			},function(err) {
				console.log("In taskUtil.pauseTask, setToBeStatus task:$taskID failed.".replace('$taskID',taskID));
				defer.reject(err);
			});
		}
		else
		{
			if (results[0].taskStatus == taskStatus["awake"] && results[0].timerID != null)
			{
				timerManager.cancelTimer(results[0].timerID);
			}
			sql = 'UPDATE fixtimetask SET taskStatus = $status, timerID = null WHERE taskID = $taskID'.replace('$status',taskStatus["faint"]).replace('$taskID',taskID);
			queryAdapter.query(sql).then(function(results2) {
				console.log("In taskUtil.pauseTask, pause task:$taskID successfully.".replace('$taskID',taskID));
				defer.resolve(true);
			},function(err) {
				console.log("In taskUtil.pauseTask, pause task:$taskID failed.".replace('$taskID',taskID));
				console.log(err);
				defer.reject(false);
			});
			
		}

	},function(err) {
		console.log("In taskUtil.pauseTask, QUERY task:$taskID failed.".replace('$taskID',taskID));
		console.log(err);
		defer.reject(false);
	});
		
	return defer.promise;
};



exports.restartTask = function(taskID) {
	var defer = Q.defer();
	var sql = 'SELECT * FROM fixtimetask WHERE taskID = $taskID'.replace('$taskID',taskID);
	queryAdapter.query(sql).then(function(results) {
		if (results.length != 1)
		{
			console.log("In taskUtil.restartTask, QUERY task:$taskID failed.".replace('$taskID',taskID));
			defer.reject(false);
		}
		else
		{
			results[0].executeDate = dateUtil.utcDateRefine(results[0].executeDate);
			var evaluatedResult = evaluateTaskTime(results[0].executeDate);
			var timerID = null;
			if (evaluatedResult.status == taskStatus["awake"] || evaluatedResult.status == taskStatus["run"])
			{
				timerID = timerManager.assignTimer(hitch(doTaskByTimer,results[0]), evaluatedResult.timeDiff==null?5000:evaluatedResult.timeDiff);
			}
			sql = 'UPDATE fixtimetask SET taskStatus = $status , timerID = $timerID WHERE taskID = $taskID'
			.replace('$status',evaluatedResult.status).replace('$timerID',timerID).replace('$taskID',taskID);
			queryAdapter.query(sql).then(function(results2) {
				console.log("In taskUtil.restartTask, restart task:$taskID successfully.".replace('$taskID',taskID));
				defer.resolve(true);
			}, function(err) {
				console.log("In taskUtil.restartTask, restart task:$taskID failed.".replace('$taskID',taskID));
				console.log(err);
				defer.reject(err);
			});
		}
	},function(err) {
		console.log("In taskUtil.restartTask, QUERY task:$taskID failed.".replace('$taskID',taskID));
		console.log(err);
		defer.reject(false);
	});
		
	return defer.promise;
};

exports.hastenTask = function(taskID,isNow,hasten)
{
	var defer = Q.defer();

	if (!hasten)
		isNow = true;

	var sql = 'SELECT * from fixtimetask WHERE taskID = $taskID'.replace('$taskID',taskID);
	queryAdapter.query(sql).then(function(results) {
		if (results.length != 1)
		{
			console.log("In taskUtil.hastenTask, QUERY task:$taskID in fixtimetask failed.".replace('$taskID',taskID));
			defer.reject(false);
		}
		else
		{
			if (results[0].taskStatus == taskStatus["run"])
			{
				console.log("In taskUtil.hastenTask, update task:$taskID in fixtimetask failed, task is running".replace('$taskID',taskID));
				defer.resolve(false);
			}
			else
			{
				if (results[0].taskStatus == taskStatus["awake"] && results[0].timerID != null)
				{
					timerManager.cancelTimer(results[0].timerID);
				}
				var timerID = null;
				var newD = isNow ? new Date():dateUtil.dateAdd(dateUtil.utcDateRefine(results[0].executeDate),-hasten);
				var evaluatedResult = evaluateTaskTime(newD);
				if (evaluatedResult.status == taskStatus["awake"] || evaluatedResult.status == taskStatus["run"])
				{
					timerID = timerManager.assignTimer(hitch(doTaskByTimer,results[0]), evaluatedResult.timeDiff==null?5000:evaluatedResult.timeDiff);
				}
				sql = 'UPDATE fixtimetask SET taskStatus = $status, executeDate = $date1, timerID = $timerID WHERE taskID = $taskID'
				.replace('$status',evaluatedResult.status).replace('$date1',dateUtil.dateToString(newD)).replace('$timerID',timerID).replace('$taskID',param.taskID);
				queryAdapter.query(sql).then(function(results2) {
					console.log("In taskUtil.hastenTask, UPDATE $taskID in fixtimetask successfully.".replace('$taskID',taskID));
					defer.resolve(true);
				},function(err) {
					console.log("In taskUtil.hastenTask, UPDATE $taskID in fixtimetask failed.".replace('$taskID',taskID));
					console.log(err);
					defer.reject(false);
				});
			}
		}
	},function(err) {
		console.log("In taskUtil.delayTask, QUERY $taskID in fixtimetask failed.".replace('$taskID',taskID));
		console.log(err);
		defer.reject(false);
	});

	return defer.promise;
};

exports.delayTask = function(taskID,isFromNow,delay) {

	var defer = Q.defer();

	var sql = 'SELECT * from fixtimetask WHERE taskID = $taskID'.replace('$taskID',taskID);
	queryAdapter.query(sql).then(function(results) {
		if (results.length != 1)
		{
			console.log("In taskUtil.delayTask, QUERY $taskID in fixtimetask failed.".replace('$taskID',taskID));
			defer.reject(false);
		}
		else
		{
			if (results[0].taskStatus == taskStatus["run"])
			{
				console.log("In taskUtil.delayTask, update $taskID in fixtimetask failed, task is running".replace('$taskID',taskID));
				defer.resolve(false);
			}
			else
			{
				if (results[0].taskStatus == taskStatus["awake"] && results[0].timerID != null)
				{
					timerManager.cancelTimer(results[0].timerID);
				}
				var timerID = null;
				var d = isFromNow ? new Date():dateUtil.utcDateRefine(results[0].executeDate);
				var newD = dateUtil.dateAdd(d,delay);
				var evaluatedResult = evaluateTaskTime(newD);
				if (evaluatedResult.status == taskStatus["awake"] || evaluatedResult.status == taskStatus["run"])
				{
					timerID = timerManager.assignTimer(hitch(doTaskByTimer,results[0]), evaluatedResult.timeDiff==null?5000:evaluatedResult.timeDiff);
				}
				sql = 'UPDATE fixtimetask SET taskStatus = $status, executeDate = $date1, timerID = $timerID WHERE taskID = $taskID'
				.replace('$status',evaluatedResult.status).replace('$date1',dateUtil.dateToString(newD)).replace('$timerID',timerID).replace('$taskID',param.taskID);
				queryAdapter.query(sql).then(function(results2) {
					console.log("In taskUtil.delayTask, UPDATE $taskID in fixtimetask successfully.".replace('$taskID',taskID));
					defer.resolve(true);
				},function(err) {
					console.log("In taskUtil.delayTask, UPDATE $taskID in fixtimetask failed.".replace('$taskID',taskID));
					console.log(err);
					defer.reject(false);
				});
			}
		}
	},function(err) {
		console.log("In taskUtil.delayTask, QUERY $taskID in fixtimetask failed.".replace('$taskID',taskID));
		console.log(err);
		defer.reject(false);
	});

	return defer.promise;
};

exports.changeFrequency = function(taskID,frequency) {
	var defer = Q.defer();
	if (taskFrequecy[frequency] == undefined)
	{
		console.log("In taskUtil.changeFrequency, FATAL ERROR: given parameter frequency:$frequency not registered in taskFrequecy.js.".replace('$frequency',frequency));
		defer.reject("Unregistered frequency type for registery.");
	}
	else
	{
		var sql = 'UPDATE fixtimetask SET fequency = $frequency WHERE taskID = $taskID'.replace('$taskID',taskID).replace('$frequency',taskFrequecy[frequency]);
		queryAdapter.query(sql).then(function(results) {
			console.log("In taskUtil.changeFrequency, UDPATE task:$taskID with frequency:$frequency in fixtimetask successfully.".replace('$taskID',taskID).replace('$frequency',frequency));
			defer.resolve(true);
		}, function(err) {
			console.log("In taskUtil.changeFrequency, UDPATE task:$taskID with frequency:$frequency in fixtimetask failed.".replace('$taskID',taskID).replace('$frequency',frequency));
			console.log(err);
			defer.reject(err);
		});
	}
	

	return defer.promise;
};

exports.initialize = function(config)
{
	if (config && typeof(config) == "object")
	{
		if (config.initFunc && typeof(config.initFunc) == "function")
		{
			taskMethods.registerInitialMethod(config.initFunc);
		}
		if (config.scanInterval && typeof(config.scanInterval) == "number" && config.scanInterval > (30 * 60 * 1000))
		{
			setScanInterval(config.scanInterval);
		}
	}
	startTasks();
};