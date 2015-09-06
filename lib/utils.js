exports.hitch = function (method,param)
{
   var f = function () {
    method(param);
  };
  return f;
};