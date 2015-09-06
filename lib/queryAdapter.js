var mysql = require('mysql');
var Q = require('Q');

var pool = null;
var ERROR_ADAPTER_NO_INIT = "In module 'nodejs-persistable-scheduler': queryAdapter.query is used for SQL:'$sql' before correct initialization.";
exports.initialize = function(config)
{
	pool = mysql.createPool(config);
};

exports.query = function(sql) {
	var defer = Q.defer();
	if (pool == null)
		defer.reject(ERROR_ADAPTER_NO_INIT.replace('$sql',sql));
	else
	{
		pool.query(sql,function(error,rows,fields){
			if (error || !rows)
			{
				console.log(error);
				defer.reject(error);
			}
			else
			{
				//console.log(rows);
				defer.resolve(rows);
			}
		});
	}
	
	return defer.promise;
};