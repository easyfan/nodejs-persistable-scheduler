var ERR_BAD_DATE_CONVERT = "dateUtil.dateToString: Bad  Date for converting: $date in module 'nodejs-persistable-scheduler'";
var ERR_BAD_DATE_UTC = "dateUtil.utcDateRefine: Bad  Date for refining: $date in module 'nodejs-persistable-scheduler'";
var ERR_BAD_DATE_ADD = "dateUtil.dateAdd: Bad  Date: $date, Add: $add in module 'nodejs-persistable-scheduler'";
var ERR_BAD_DATE_ADD_YEARS = "dateUtil.dateAddYears: Bad  Date: $date, Years: $add in module 'nodejs-persistable-scheduler'";
var ERR_BAD_DATE_ADD_MONTHS = "dateUtil.dateAddMonths: Bad  Date: $date, Months: $add in module 'nodejs-persistable-scheduler'";
var ERR_BAD_DATE_ADD_DAYS = "dateUtil.dateAddDays: Bad  Date: $date, Days: $add in module 'nodejs-persistable-scheduler'";
var ERR_BAD_DATE_ADD_HOURS = "dateUtil.dateAddHours: Bad  Date: $date, Hours: $add in module 'nodejs-persistable-scheduler'";
var ERR_BAD_DATE_ADD_MINUTES = "dateUtil.dateAddMinutes: Bad  Date: $date, Minutes: $add in module 'nodejs-persistable-scheduler'";
var ERR_BAD_DATE_ADD_SECONDS = "dateUtil.dateAddSeconds: Bad  Date: $date, Seconds: $add in module 'nodejs-persistable-scheduler'";

exports.utcDateRefine = function(date)
{
	if (date instanceof Date)
	{
		var d = new Date();
		if (date.alreadyUTCRefined)
		{
			d.setFullYear(date.getFullYear(),date.getMonth(),date.getDate());
			d.setHours(date.getHours(),date.getMinutes(),date.getSeconds());
		}
		else
		{
			d.setUTCFullYear(date.getFullYear(),date.getMonth(),date.getDate());
			d.setUTCHours(date.getHours(),date.getMinutes(),date.getSeconds());
		}
		d.alreadyUTCRefined = true;
		return d;
	}
	else
	{
		throw ERR_BAD_DATE_UTC.replace('$date',date);
	}
}

exports.dateToString = function(date)
{
	if (date instanceof Date)
	{
		return "'$d'".replace("$d",date.toISOString().slice(0, 19).replace('T', ' '));
	}
	else
	{
		throw ERR_BAD_DATE_CONVERT.replace('$date',date);
	}
	
};

exports.dateAdd = function(date,add)
{
	if (date instanceof Date && typeof(add) == 'number')
	{
		var d = new Date();
		d.setTime(date.getTime() + add);
		if (date.alreadyUTCRefined)
			d.alreadyUTCRefined = true;
		return d;
	}
	else
	{
		throw ERR_BAD_DATE_ADD.replace('$date',date).replace('$add',add);
	}
};

exports.dateAddYears = function(date,add)
{
	if (date instanceof Date && typeof(add) == 'number')
	{
		var d = new Date();
		d.setFullYear(date.getFullYear()+add,date.getMonth(),date.getDate());
		d.setHours(date.getHours(),date.getMinutes(),date.getSeconds());
		if (date.alreadyUTCRefined)
			d.alreadyUTCRefined = true;
		return d;
	}
	else
	{
		throw ERR_BAD_DATE_ADD_YEARS.replace('$date',date).replace('$add',add);
	}
};

exports.dateAddMonths = function(date,add)
{
	if (date instanceof Date && typeof(add) == 'number')
	{
		var d = new Date();
		d.setFullYear(date.getFullYear(),date.getMonth()+add,date.getDate());
		d.setHours(date.getHours(),date.getMinutes(),date.getSeconds());
		if (date.alreadyUTCRefined)
			d.alreadyUTCRefined = true;
		return d;
	}
	else
	{
		throw ERR_BAD_DATE_ADD_MONTHS.replace('$date',date).replace('$add',add);
	}
};

exports.dateAddDays = function(date,add)
{
	if (date instanceof Date && typeof(add) == 'number')
	{
		var d = new Date();
		d.setFullYear(date.getFullYear(),date.getMonth(),date.getDate()+add);
		d.setHours(date.getHours(),date.getMinutes(),date.getSeconds());
		if (date.alreadyUTCRefined)
			d.alreadyUTCRefined = true;
		return d;
	}
	else
	{
		throw ERR_BAD_DATE_ADD_DAYS.replace('$date',date).replace('$add',add);
	}
};

exports.dateAddHours = function(date,add)
{
	if (date instanceof Date && typeof(add) == 'number')
	{
		var d = new Date();
		d.setFullYear(date.getFullYear(),date.getMonth(),date.getDate());
		d.setHours(date.getHours()+add,date.getMinutes(),date.getSeconds());
		if (date.alreadyUTCRefined)
			d.alreadyUTCRefined = true;
		return d;
	}
	else
	{
		throw ERR_BAD_DATE_ADD_HOURS.replace('$date',date).replace('$add',add);
	}
};

exports.dateAddMinutes = function(date,add)
{
	if (date instanceof Date && typeof(add) == 'number')
	{
		var d = new Date();
		d.setFullYear(date.getFullYear(),date.getMonth(),date.getDate());
		d.setHours(date.getHours(),date.getMinutes()+add,date.getSeconds());
		if (date.alreadyUTCRefined)
			d.alreadyUTCRefined = true;
		return d;
	}
	else
	{
		throw ERR_BAD_DATE_ADD_MINUTES.replace('$date',date).replace('$add',add);
	}
};



exports.dateAddSeconds = function(date,add)
{
	if (date instanceof Date && typeof(add) == 'number')
	{
		var d = new Date();
		d.setFullYear(date.getFullYear(),date.getMonth(),date.getDate());
		d.setHours(date.getHours(),date.getMinutes(),date.getSeconds()+add);
		if (date.alreadyUTCRefined)
			d.alreadyUTCRefined = true;
		return d;
	}
	else
	{
		throw ERR_BAD_DATE_ADD_SECONDS.replace('$date',date).replace('$add',add);
	}
};