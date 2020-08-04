//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>shameless_inc's Cookie Miner v2.1.1<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>A Cookie Clicker automation script<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

//Paste this JavaScript code into the Cookie Clicker's JavaScript console.
//You can access the console by opening the web browser'.s dev tools with F12
//This script will click the cookie as fast as possible.
//If a golden cookie spawns, it will be automatically clicked within a second.
//Upgrades will be automatically bought when you have enough cookies.
//There's a known bug that causes the grandmapocalypse to result in a loop
//opening the prompt so many times that you will not be able to close it.

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>RELOADING THE PAGE WILL STOP THE SCRIPT.<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

//This script will intelligently select which objects to buy to get CPS efficiently
//by evaluating how much Time (t) you will need to be able to afford the item.
//Also, it will consider how much CPS you will actually get from the object and how much it costs (c).
//The formula used to evaluate the items is CPS/(c*t).
//The script will wait until you have enough cookies and buy it as soon you can afford it.

//The script will every second make a report in the console.
//The report consists of the values Cookies (you have in your bank), CPS (without clicks),
//the delta from the last second (how many cookies you gained since the last report, think of this as CPS including mouse clicks),
//which item is going to be bought next and an estimation on how long you will have to wait until that.
//The values are not perfectly precise and may be inconsistent at times, but they are mostly right
//and give you an idea how much cookies you will get and what this script is doing. The time estimation is based on the
//delta value and might be bogus at times (e.g. when something was bought in the last second) but it should eventually correct itself.

//If you have any feedback, please feel free to contact me on Reddit:
//https://www.reddit.com/r/CookieClicker/comments/32d6ht/automation_script_v21_even_faster_smart_selection/
//Turning off some effects can make it run faster in the later game.
//I hope you like my work! :)

var runGoldenCookieLoop = false;
var runUpgradeloop = false;

function ClickService(interval){
	var self = this;
	
	self.interval = interval;
	self.clickLoop;
	
	self.start = function(){
		self.clickLoop = setInterval(function(){
			setTimeout(function(){
				Game.ClickCookie();
			}, self.interval);
		});
	}
	
	self.stop = function(){
		if(self.clickLoop != undefined){
			clearInterval(self.clickLoop);
		}
	}
}

function goldenCookieLoop () {
	setTimeout(function () {
		Game.goldenCookie.click();
		if(runGoldenCookieLoop) {
			goldenCookieLoop();
		}
	}, 1000);
}

function upgradeLoop () {
	setTimeout(function () {
		for(var i = 0; i < Game.UpgradesInStore.length; i++){
			Game.UpgradesInStore[i].buy()
		}
		if(runUpgradeloop) {
			upgradeLoop();
		}
	}, 5);
}

function runAllLoops(){
	runGoldenCookieLoop = true;
	runUpgradeloop = true;
	
	goldenCookieLoop();
	upgradeLoop();
}
function stopAllLoops(){
	runGoldenCookieLoop = false;
	runUpgradeloop = false;
}

function showCookieDisplay (bool){
	if(bool)
		l('cookies').style.display = 'block';
	else
		l('cookies').style.display = 'none'
}

//Handles data reporting for other services and provides ticks via notifications
function ReportService () {
	var self = this;
	
	self.timing = 50;
	
	self.count = Game.cookiesd;
	self.cps = Game.cps;
	self.delta = 0;
	self.deltaBySecond = 0;
	self.index = 0;
	self.lastCount = 0;
	self.lastDelta = 0;
	self.lastCountBySecond = 0;
	
	self.subscribers = Array();
	self.reports = Array();
	
	self.tick = function() {
		setTimeout(function(){
			self.refreshData();
			self.notifySubscribers();
			self.consoleReport();
			self.tick();
		}, self.timing);
	}
	
	self.subscribe = function(fn) {
		self.subscribers.push(fn);
	}
	
	self.addReport = function(fn) {
		self.reports.push(fn);
	}
	
	self.refreshData = function() {
		self.lastCount = self.count;
		self.count = Game.cookiesd;
		self.cps = Game.cookiesPs*(1-Game.cpsSucked);
		self.lastDelta = self.delta;
		self.delta = self.count - self.lastCount;
		self.index++;
	}
	
	self.notifySubscribers = function() {
		for(var i = 0; i < self.subscribers.length; i++){
			self.subscribers[i]();
		}
	}
	
	self.getReports = function() {
		var report = '';
		for(var i = 0; i < self.reports.length; i++){
			var curReport = self.reports[i]();
			if(curReport != ''){
				report = report + curReport;
				if(i < self.reports.length){
					report = report + '\n';
				}
			}
		}
		
		return report;
	}
	
	self.consoleReport = function() {
		//Report every second
		if(self.index * self.timing % 1000 === 0){
			self.deltaBySecond = self.count - self.lastCountBySecond;
			self.lastCountBySecond = self.count;
			var report = self.getReports();
			if(report != ''){
				report = '\n' + report;
			}
			console.log('Cookies:\t' + Beautify(self.count) + '\nCPS:\t\t' + Beautify(self.cps) + '\nDelta:\t\t' + Beautify(self.deltaBySecond) + report);
		}
	}
	
	self.tick();
}

//Handles buying objects
function ObjectService(reportService){
	var self = this;
	
	//Next object being bought
	self.target;
	
	//Find best object to buy next
	self.findBestObject = function(){
		//TODO: don't operate on first delta values
		var bestValue = 0;
		var bestIndex = -1;
		for(var i = 0; i < Game.ObjectsById.length; i++){
			var obj = Game.ObjectsById[i];
			var value = 0;
			if(obj.locked === 0){
				value = obj.cps() / (obj.getPrice() / reportService.delta);
			}
			if(value > bestValue){
				bestValue = value;
				bestIndex = i;
			}
		}
		//Set target to most efficient buy
		self.target = Game.ObjectsById[bestIndex];
	}
	
	self.buyTarget = function(){
		self.target.buy();
		self.target = undefined;
	}
	
	self.onTick = function(){
		if(self.target != undefined){
			if(reportService.count >= self.target.getPrice()){
				self.buyTarget();
			}
		}
		else{
			self.findBestObject();
		}
	}
	
	self.report = function(){
		if(self.target != undefined){
			var estimation = Math.round(((self.target.getPrice() - reportService.count) / reportService.deltaBySecond));
			return 'Next buy:\t' + self.target.name + '\t|\tEstimated waiting time:\t' + estimation + ' seconds';
		}
		else
			return '';
	}
	
	reportService.subscribe(self.onTick);
	reportService.addReport(self.report);
}

var Clicker = new ClickService(1);
Clicker.start();
var Report = new ReportService();
var ObjectService = new ObjectService(Report);
runAllLoops();
