# nodejs-persistable-scheduler
==============================

## Summary:
A nodejs based, persist by mysql, timely task framework;

## Installation:
```sh
$ npm install nodejs-persistable-scheduler
```

## Dependency:
1. [q](https://www.npmjs.com/package/q): *A library for promises (CommonJS/Promises/A,B,D);*
2. [mysql](https://www.npmjs.com/package/mysql): *A node.js driver for mysql. It is written in JavaScript, does not require compiling, and is 100% MIT licensed.*

## Introduction:
This module is a nodejs based, persist by mysql, timely task framework;  
There are 4 components that compose the whole module:  
### 1. Initialization component:  
Which is repsonsible to doing the initialization works for making the functions of whole module available. In general, the initialization works are sperated into 2 parts: A system initialization task which will create 2 database tables named "fixtimetask" and "scanrecord" in the DB reference that discribed in the configurations; and a customized initialization task which will add maintaining level tasks(not user event triggered tasks, on some other words) if you need any.  
This component will be executed **ONLY ONCE** (Well, actually, you can execute it more than once within some tricky way, referring to the (Best Prectice)[#tests:] please);  
### 2. Fallback component:  
Which is responsible to doing 2 steps of fallback work evertime the current instance of [nodejs-persistable-scheduler](https://www.npmjs.com/package/nodejs-persistable-scheduler) startup: 1. Find out the in-complete executing initialization and maintainess tasks in the last running from the persistance, and run them again; And 2 start the tasks maintainess monitor;  
### 3. Task component:  
Which is a framework for registering/executing/delaying/hastening/cancelling/pausing/restarting tasks from customers; 
### 4. Result recording component:  
Which is responsible to recording the initialization/maintainess task status into persistance while executing.


## Best Prectice:
### 
## Tests:

## Contributing:

## Release History:
