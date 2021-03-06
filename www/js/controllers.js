angular.module('starter.controllers', ['starter.services.jobs','starter.services.settings'])

.controller('AppCtrl', function($scope, $ionicModal, $timeout, $cordovaDevice, $ionicPopup, $state, $ionicHistory, $ionicBackdrop, ScheduledJobsService, SettingsService, $cordovaInAppBrowser, $cordovaClipboard, $cordovaToast, $stateParams) {

	//form data for devices
	
	$scope.scheduledJobs = [];
	$scope.jobInfo = {};
	
	

	$scope.toggleBrokerConnection = function(){

		$ionicBackdrop.retain();

		if( $scope.deviceStates.broker == true ){
			$scope.connectMQTT();	
		}else{
			$scope.disconnectMQTT();
		}
	};


	
	
	
	
	$scope.reloadJobData = function(){
		$ionicBackdrop.retain();
		
		console.log('Reloading job data');
		
		ScheduledJobsService.list().then(function(data){
			$scope.scheduledJobs = data;
			$ionicBackdrop.release();
		});
	};
	
	$scope.addJob = function(){
		
		console.log('Adding new job');
		
		$ionicBackdrop.retain();
		
		$scope.jobInfo.jobidentifier = $scope.generateGuid();
		
		ScheduledJobsService.addJob($scope.jobInfo).then(function(data){
			
			if(data.hasOwnProperty('error')){
				if(data.error === 'true'){
					alert(data.message);
				}else{
					$ionicHistory.nextViewOptions({
						disableBack: true
					});
					$state.go('app.jobs');
				}
			}
			
			$ionicBackdrop.release();
		});
		
		console.log('Exiting adding new job');
	};
	
	$scope.updateJob = function(){
		
		console.log('Saving edited job');
		
		$ionicBackdrop.retain();
		
		ScheduledJobsService.updateJob($scope.jobInfo).then(function(data){
			
			if(data.hasOwnProperty('error')){
				if(data.error === 'true'){
					alert(data.message);
				}else{
					$ionicHistory.nextViewOptions({
						disableBack: true
					});
					$state.go('app.jobs');
				}
			}
			
			$ionicBackdrop.release();
		});
		
		console.log('Exiting updating job');
	};
	
	$scope.deleteJob = function(jobId){
		
		var job = ScheduledJobsService.get(jobId);
		
		var confirmPopup = $ionicPopup.confirm({
			title: 'Confirm delete job ' + job.jobName + "?",
			template: 'Confirm to proceed'
		});

		confirmPopup.then(function(res) {
			if(res) {
				
				$ionicBackdrop.retain();
				
				ScheduledJobsService.deleteJob(job).then(function(data){
			
					if(data.hasOwnProperty('error')){
						if(data.error === 'true'){
							alert(data.message);
						}else{
							$scope.reloadJobData();
						}
					}
					$ionicBackdrop.release();
				});
				
				$ionicBackdrop.release();
			} 
		});
	};
	
	$scope.copyToClipboard = function(text){
		
		$cordovaClipboard
			.copy(text)
			.then(function () {
				$cordovaToast
					.show('Schedule copied to clipboard', 'long', 'center');
			}, function () {
			  $cordovaToast
					.show('Something went wrong :(', 'long', 'center');
			});
	};
	
	$scope.showCronHelp = function(){
		var options = {
			location: 'yes',
			clearcache: 'yes',
			toolbar: 'no'
		};
		$cordovaInAppBrowser.open('http://www.quartz-scheduler.org/documentation/quartz-2.x/tutorials/crontrigger.html', '_blank', options);
	};
	
	$scope.$on('$ionicView.beforeEnter', function () {

		var $currState = $ionicHistory.currentView().stateId;

		if($currState == 'app.jobs'){
			
			console.log('Loading jobs data.');
			console.log('Server configuration: ' + JSON.stringify(SettingsService.getBrokerInfo()));
			ScheduledJobsService.list().then(function(data){
				$scope.scheduledJobs = data;
			});
			//console.log('# of jobs returned: ' + $scope.scheduledJobs.length);
		}else if ($currState.indexOf('app.editJob') >= 0){
			
			//dirty hack until i figure why state params is not working..
			var jobId = $currState.split('=')[1];
			
			ScheduledJobsService.list().then(function(data){
				
				$scope.jobInfo = ScheduledJobsService.get(jobId);
				console.log(JSON.stringify($scope.jobInfo));
			});
		}
	});

})

.controller('SettingsCtrl', function($scope, $ionicModal, $timeout, $cordovaDevice, $ionicPopup, $state, $ionicHistory, $ionicBackdrop, SettingsService, $cordovaInAppBrowser) {

	//form data for devices
	$scope.brokerInfo = {};
	
	$scope.saveSettings = function() {
		
		console.log('before saving settings: ' + JSON.stringify($scope.brokerInfo));
		SettingsService.setBrokerInfo($scope.brokerInfo);
		
		$ionicPopup.alert({
			title: 'MQ Broker Settings',
			template: 'Settings saved successfully.'
		});
	};

	$scope.$on('$ionicView.beforeEnter', function () {
		
		if(window.localStorage  == undefined){
			$ionicPopup.alert({
				title: 'MQ Broker Settings',
				template: 'Device does not support local storage.'
			});
		}
		
		var $currState = $ionicHistory.currentView().stateId;
		
		if($currState == 'settings.mqbroker'){
			$scope.brokerInfo = SettingsService.getBrokerInfo();
		};
	});

})

.controller('PowermonCtrl', function($scope, $ionicModal, $timeout, $cordovaDevice, $ionicPopup, $state, $ionicHistory, $ionicBackdrop, SettingsService, $cordovaInAppBrowser) {

	//chart data
	$scope.labels = [];
	$scope.data = [
		[]
	];
	$scope.series = ['W/hr'];
	
	$scope.$on('mqtt-message-arrival', function(event, args) {
		
		if(args.destinationName == 'fromPowerMon'){
			var currentDate = new Date();
			
			if($scope.labels.length > 10){
				$scope.labels.shift();
				$scope.data[0].shift();
			}
			
			$scope.labels.push('' + currentDate.getHours() + ":" + currentDate.getMinutes());
			$scope.data[0].push(Number(args.payload));
			
			$scope.$apply();
		}
	});

	$scope.$on('$ionicView.enter', function () {
		
		$scope.connectMQTT();	
		
	});

	$scope.$on('$ionicView.leave', function () {
		
		$scope.disconnectMQTT();
		
	});

})


.controller('ControlCtrl', function($scope, $state, $cordovaToast) {

	$scope.deviceStates = {};
	$scope.deviceStatesText = {};
	$scope.deviceStatesText.brokerState = "disconnected";
	$scope.deviceStatesText.pumpState = "off";
	
	$scope.$on('$ionicView.enter', function () {
		
		$scope.connectMQTT();	
		
	});

	$scope.$on('$ionicView.leave', function () {
		
		$scope.disconnectMQTT();
		
	});
	
	$scope.togglePumpState = function(){

		var message = 'off';
		if( $scope.deviceStates.pump == true ){
			message = 'on';
		}
		
		if( false == $scope.sendMQTTMessage('toPump', message) ){
			//unable to send message for any reason
			$scope.deviceStates.pump = false;
			$scope.deviceStatesText.pumpState = "off";
		}else{
			if( $scope.deviceStates.pump == true ){
				$scope.deviceStatesText.pumpState = "on";
			}else{
				$scope.deviceStatesText.pumpState = "off";
			}
		}
	};
	
	$scope.$on('mqtt-connect-success', function(event, args) {

		$scope.deviceStatesText.brokerState = "connected";

		$cordovaToast
			.show('Connected to MQTT Broker', 'long', 'center');

	});

	$scope.$on('mqtt-disconnect-success', function(event, args) {

		$scope.deviceStatesText.brokerState = "disconnected";

	    $cordovaToast
			.show('Disconnected from MQTT Broker', 'long', 'center');

	});
	
	$scope.$on('mqtt-connect-failure', function(event, args) {

		$scope.deviceStatesText.brokerState = "disconnected";

		$cordovaToast
			.show('Unable to connect/Disconnected', 'long', 'center');

	});


})