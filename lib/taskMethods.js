
var methods = [];
var methodNameMap = {
};
var initalMethod = null;

/****************************************************************************
**
**    Function taskMethods.registerMethod is for registering the execute 
**    method that will be used in task execution.
**
**    The method that could be accepted by taskMethods.registerMethod:
**    Accept parameter: 1 complete record queryed from fixtimetask;
**    Return value: true when registering successfully, or false by duplicated name;
**
**    The method name that could be accepted by taskMethods.registerMethod:
**    Not a duplicated method name with already registered method names;
**
******************************************************************************/ 

exports.registerMethod = function(method,name) 
{
	if (methodNameMap[name] == undefined)
	{
		console.log("in taskMethods.registerMethod $name".replace('$name',name));
		var length = methods.push(method);
		methodNameMap[name] = length - 1;
		return true;
	}
	else
	{
		return false;
	}
};

exports.registerInitialMethod = function(method) 
{
	initalMethod = method;
};

exports.getMethodByID = getMethodByID = function(id)
{
	return methods[id];
};

exports.getIDByName = function(name)
{
	return methodNameMap[name];
};

exports.getMethodByName = function(name) {
	if (methodNameMap[name] == undefined)
	{
		console.log("in taskMethods.getMethodByName $name not found".replace('$name',name));
		return null;
	}
	else
	{
		console.log("in taskMethods.getMethodByName $name, $id found".replace('$name',name).replace('$id',methodNameMap[name]));
		return getMethodByID(methodNameMap[name]);
	}
};

exports.getInitialMethod = function()
{
	return initalMethod;
};