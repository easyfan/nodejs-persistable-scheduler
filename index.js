/*
**
**  A nodejs based, persist by mysql, timely and repeatable task framework;
**
*/
//Required lib modules
var queryAdapter = require('./lib/queryAdapter');
var taskUtil = require('./lib/taskUtil');
var taskMethods = require('./lib/taskMethods');
var initialized = false;
var initializeCheck = function() {
	if (!initialized)
		throw ERR_USE_WITHOUT_INIT;
};

//Exception Messages
var ERR_ILLEGAL_CONFIG = "Illegal configure for initializing module 'nodejs-persistable-scheduler'";
var ERR_ILLEGAL_FUNC = "Illegal functions for initializing module 'nodejs-persistable-scheduler'";
var ERR_ILLEGAL_FUNC_NAME = "Dulicate function name:'$name' for initializing module 'nodejs-persistable-scheduler'";
var ERR_USE_WITHOUT_FUNC = "Try using module 'nodejs-persistable-scheduler' without registered functions.";
var ERR_USE_WITHOUT_INIT = "Try using module 'nodejs-persistable-scheduler' without correct initialization.";

//Exports
module.exports = {
	/*
	**
	** The initial entry of the whole 'nodejs-persistable-scheduler' module;
	**
	** @param: {Object} config: Give the configuration for mysql db and scheduler, for example:
	**							{
	**								db://DB configuration, MUST HAVE ONE
	**								{
	**	    							host: {String},//DB host name or IP;
	**	    							user: {String},//DB user name;
	**	    							password: {String},//DB user password;
	**	    							database:{String},//DB name;
	**	    							port: {Number}//DB port number;
	**								},
	**								methods://A methods array for registering, MUST HAVE ONE; DO NOT CHANGE THE ORDER WHILE MAINTAINING!!! Append to the tail, if any new added methods;
	**								[
	**									{
	**										name: {String},//Name of the mehtod for executing in this module, must not be deplicated;
	**										func: {Function} //the function of the method for executing in this module, , must not be deplicated;
	**									},...
	**								],
	**								scheduler://Task scheduler configuration, an optional one;
	**								{
	**									initFunc: {Function}, //a function that return Q.promise, for dealing with the tasks need to be run only once;
	**									scanInterval: {Number}//A tunning option, In MS, must be longer than 4 hours (=4*60*60*1000), Default by 24 hours (=24*60*60*1000);
	**								}
	**							}
	**
	** @return: {Boolean}: Return true if an instance of this module is created successfully; 
	**
	** Caution: 
	** 1. Please keep available of the DB naming 'fixtimetask' and 'scanrecord' for module 'nodejs-persistable-scheduler';
	** 2. Inside one NODEJS instance, or multiple NODEJS instances that sharing a same DB,
	** only 1 'nodejs-persistable-scheduler' instance allowed.
	** 3. For different NODEJS instances that are not sharing a same DB, there could be multiple 
	** 'nodejs-persistable-scheduler' instances.
	**
	*/
	initialize: function(config) {
		if (config && typeof(config) == "object" && config.db && typeof(config.db) == "object" 
			&& config.db.host && typeof(config.db.host) == "string"
			&& config.db.user && typeof(config.db.user) == "string"
			&& config.db.password && typeof(config.db.password) == "string"
			&& config.db.database && typeof(config.db.database) == "string"
			&& config.db.port && typeof(config.db.port) == "number")
		{
			if (config.methods && config.methods instanceof Array && config.methods.length > 0)
			{
				config.methods.forEach(function(method) {
					if (!taskMethods.registerMethod(method.func,method.name))
						throw ERR_ILLEGAL_FUNC_NAME.replace('$name',method.name);
				});
			}
			else
				throw ERR_ILLEGAL_FUNC;

			queryAdapter.initialize(config.db);

			if (config.scheduler && typeof(config.scheduler) == "object" )
			{
				taskUtil.initialize(config.scheduler);
			}
			initialized = true;
		}
		else
			throw ERR_ILLEGAL_CONFIG;
	},
	/***********************************************************************************************************
	**
	**   startTasks:		For starting the task regirstration and maintain component;
	**                  	No return;
	**
	************************************************************************************************************/
	startTasks:	function() {
		initializeCheck();
		taskUtil.startTasks();
	},
	/***********************************************************************************************************
	**
	**   registerTask:		For registering new task, the methodName should be registered in taskMethods.js;
	**                  	By Q.defer.promise, return created taskID if succeed;
	**   @param:			{String} frequency: Execute frequency for the task, acceptable value set 
	**						["none","fixinterval","annually","semiannually","seasonly","monthly","semimonthly",
	**						"weekly","semiweekly","daily","semidaily","hourly","halfhourly"];
	**   @param:			{Date} firstDate: The first execute date for the task;
	**   @param:			{String} methodName: The exectue method name for the task, should be registered by registerMethod;
	**   @param:			{Number} param: External parameter for the execute method;
	**   @param:			{Number} intervalTime: In MS. If the execute frequency selected as "fixinterval", 
							this value will be used as the time interval between executions;
	**   @return:			{Q.promise}:return created taskID if succeed;
	**
	************************************************************************************************************/
	registerTask: function(frequency,firstDate,methodName,param,intervalTime) {
		initializeCheck();
		//console.log(frequency+firstDate+methodName+param+intervalTime);
		return taskUtil.registerTask(frequency,firstDate,methodName,param,intervalTime);
	},
	/***********************************************************************************************************
	**
	**   cancelTask:		For removing a specified task by task ID, will be derferred if task is running;
	**                  	By Q.defer.promise, return true when cancel directly, false when deferred, if succeed;
	**   @param:			{Number} taskID: ID of specified task;
	**   @return:			{Q.promise}: return true when cancel directly, false when deferred, if succeed;
	**
	************************************************************************************************************/
	cancelTask:	function(taskID) {
		initializeCheck();
		return taskUtil.cancelTask(taskID);
	},
	/***********************************************************************************************************
	**
	**   pauseTask:			For pausing a repeat task by task ID, will be derferred if task is running;
	**                  	By Q.defer.promise, return true when pause directly, false when deferred, if succeed;
	**   @param:			{Number} taskID: ID of specified task;
	**   @return:			{Q.promise}: return true when pause directly, false when deferred, if succeed;
	**
	************************************************************************************************************/
	pauseTask:	function(taskID) {
		initializeCheck();
		return taskUtil.pauseTask(taskID);
	},
	/***********************************************************************************************************
	**
	**   restartTask:		For restarting a specified paused task by ID;
	**                  	By Q.defer.promise, return true if succeed;
	**   @param:			{Number} taskID: ID of specified task;
	**   @return:			{Q.promise}: return true if succeed;
	**
	************************************************************************************************************/
	restartTask: function(taskID) {
		initializeCheck();
		return taskUtil.restartTask(taskID);
	},
	/***********************************************************************************************************
	**
	**   hastenTask: 		For hastening the next execution time of a specified task by task ID with a given hasten peried;
	**						By Q.defer.promise, return true if succeed. Running task WILL NOT be hastened;
	**   @param:			{Number} taskID: ID of specified task;
	**   @param:			{Boolean} isNow: execute the mehtod immiditely if value equal to ture;
	**   @param:			{Number} hasten: In MS; The time to be hastend;
	**   @return:			{Q.promise}: return true if succeed.
	**
	************************************************************************************************************/
	hastenTask:	function(taskID,isNow,hasten) {
		initializeCheck();
		return taskUtil.hastenTask(taskID,isNow,hasten);
	},
	/***********************************************************************************************************
	**
	**   delayTask: 		For delaying the next execution time of a specified task by task ID with a given delay period;
	**                  	By Q.defer.promise, return true if succeed. Running task WILL NOT be delayed;
	**   @param:			{Number} taskID: ID of specified task;
	**   @param:			{Boolean} isFromNow: Delay the task from now if value equal to true;
	**   @param:			{Number} delay: In MS; The time to be delayed;
	**   @return:			{Q.promise}: return true if succeed.
	**
	************************************************************************************************************/
	delayTask: function(taskID,isFromNow,delay) {
		initializeCheck();
		return taskUtil.delayTask(taskID,isFromNow,delay);
	},
	/***********************************************************************************************************
	**
	**   changeFrequency: 	For changing the execution frequency of specified task by ID to a given frequency;
	**                  	By Q.defer.promise, return true if succeed;
	**   @param:			{Number} taskID: ID of specified task;
	**   @param:			{String} frequency: Execute frequency for the task, acceptable value set 
	**						["none","fixinterval","annually","semiannually","seasonly","monthly","semimonthly",
	**						"weekly","semiweekly","daily","semidaily","hourly","halfhourly"];
	**   @param:			{Number} intervalTime: In MS. If the execute frequency selected as "fixinterval", 
							this value will be used as the time interval between executions;
	**   @return:			{Q.promise}: return true if succeed;
	**
	************************************************************************************************************/
	changeFrequency: function(taskID,frequency,intervalTime) {
		initializeCheck();
		return taskUtil.changeFrequency(taskID,frequency,intervalTime);
	}
};

