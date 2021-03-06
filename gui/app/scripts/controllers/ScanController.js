/***

Copyright (C) 2015, 2016 Teclib'

This file is part of Armadito gui.

Armadito gui is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Armadito gui is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Armadito gui.  If not, see <http://www.gnu.org/licenses/>.

***/

'use strict';

/**
 * @ngdoc function
 * @name armaditoApp.controller:ScanController
 * @description
 * # ScanController
 * Controller of the Armadito-av
 */
 
 var os = require('os');
 var homedir = require('homedir');

angular.module('armaditoApp')
  .controller('ScanController', ['$rootScope','$scope','ArmaditoSVC','ArmaditoIPC','$uibModal', function ($rootScope,$scope,ArmaditoSVC,ArmaditoIPC, $uibModal) {

    $scope.initTab = function(){   
   
	    $scope.type = "analyse_view.Choose_analyse_type";
	    $scope.malware_count = 0;
	    $scope.suspicious_count = 0;
	    $scope.scanned_count = 0;

	    $scope.scan_data = {
	      path_to_scan : "",
	      progress : 0
	    };
	    
	    $scope.scan_data.files = [];
    }

    // This function refresh structure values from data receive from AV. 
    // callback function
    $scope.threatDataFromAv = function(data){

      var json_object;
      var jobj_modules;
      var date = new Date().toISOString();

      try {

        json_object = JSON.parse(data);

        //console.log("[+] Debug :: Data received from av :: "); //, json_object);

        // Handle the first response of the av.
        if(json_object.av_response == "scan" && json_object.status == 0 ){
          console.log("[+] Debug :: Scan order send successfully to av!\n");     
	  $scope.scan_data.progress = 0; 
	  global.scan_in_progress = 1;    
	  $scope.$apply();
          return;
        }

        // Handle progress  information from av
        if(json_object.ihm_request == "scan"){

          $scope.scan_data.progress = json_object.params.progress ;
          //console.log("[+] Debug :: progress = ", $scope.scan_data.progress);

	  if(json_object.params.path){
	      $scope.scan_data.displayed_file = json_object.params.path;	  
          }

          if(json_object.params.scan_status === 'malware' || json_object.params.scan_status === 'suspicious'){
            $scope.scan_data.files.push(json_object.params);
          }

	  if(json_object.params.malware_count){
	     $scope.malware_count = json_object.params.malware_count;
	  }
	
          if(json_object.params.suspicious_count){
	     $scope.suspicious_count = json_object.params.suspicious_count;
          }	
	
          if(json_object.params.scanned_count){
	     $scope.scanned_count = json_object.params.scanned_count;
          }	

          //console.log("tableau", $scope.scan_data.files);

          // terminate scan.
          if($scope.scan_data.progress == 100){
               console.log("[+] Debug :: Scan finished!");
	       global.scan_in_progress = 0;

	       // Scan is finished, we remove listener
	       $rootScope.myEmitter.removeListener('scan_info', $scope.threatDataFromAv);
          }

          $scope.$apply();
        }
        
      }
      catch(e){
        console.error("Parsing error:", e); 
	json_object = null;
        return null;
      }

      json_object = null;
    }

    $scope.StartScan = function(){
    
     // console.log("[+] Debug :: type d'analyse ::", $scope.type);


      if($scope.type == "analyse_view.Full_scan"){
	
	// TODO: Set full_scan path in AV-side
	
        console.log("[+] Debug :: Full scan ::\n");
        if(os.platform() == "win32"){
           $scope.scan_data.path_to_scan = "C:\\";
	}
	else {
	   $scope.scan_data.path_to_scan = "/";	
	}

      }else if($scope.type == "analyse_view.Quick_scan"){

        console.log("[+] Debug :: Quick scan ::\n");

	// TODO: Set quick_scan path in AV-side

        if(os.platform() == "win32"){
	   var userpath = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
	   userpath = userpath.replace(/\\/g, "\\\\");
	   $scope.scan_data.path_to_scan =  userpath ;
	}
	else {
	   
	   $scope.scan_data.path_to_scan = homedir(); // "/home";	
	}

      }else if($scope.type == "analyse_view.Custom_scan"){
        console.log("[+] Debug :: Custom scan ::\n");
      }
      else{
        // display a notif.
        console.log("[+] Debug :: Please enter an analysis type ::\n");
        return;
      }

      // reset variables
      $scope.scan_data.progress = 0;
      $scope.scan_data.files = [];
      $scope.scan_data.displayed_file = "";
      $scope.malware_count = 0;
      $scope.suspicious_count = 0;
      $scope.scanned_count = 0;
      $scope.canceled = 0;

      // we remove last listener
      $rootScope.myEmitter.removeListener('scan_info', $scope.threatDataFromAv);

      // register emitter 
      $rootScope.myEmitter.addListener('scan_info', $scope.threatDataFromAv);

      ArmaditoSVC.launchScan($scope.scan_data.path_to_scan, $scope.threatDataFromAv);

    };

    $scope.CancelScan = function(){
    
      //console.log("[+] Debug :: cancel scan ::", $scope.type);
	      
      if($scope.canceled == 0){
           ArmaditoSVC.cancelScan($scope.threatDataFromAv);
	   $scope.canceled = 1;
      }

    };


    $scope.fullScan = function () {
       $scope.type = "analyse_view.Full_scan";
    };

    $scope.quickScan = function () {
      $scope.type = "analyse_view.Quick_scan";
    };

    $scope.customScan = function () {
      $scope.type = "analyse_view.Custom_scan";
      var size = 'sm';
      var modalInstance = $uibModal.open({
        animation: $scope.animationsEnabled,
        templateUrl: 'views/customAnalyse.html',
        controller: 'customAnalyseController',
        size: size,
        resolve: {
          items: function () {
          return $scope.items;
        }
      }
      });

      modalInstance.result.then(function (scanOptions) {
        $scope.scanOptions = scanOptions;
        //console.log("Scan options : ", $scope.scanOptions);
        $scope.scan_data.path_to_scan = $scope.scanOptions.pathToScan;
        $scope.StartScan();
      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });

    };

    $scope.truncate = function (fullStr, strLen) {
        if (fullStr.length <= strLen){
          return fullStr;
        }
        var separator = '...';
        
        var sepLen = separator.length,
            charsToShow = strLen - sepLen,
            frontChars = Math.ceil(charsToShow/2),
            backChars = Math.floor(charsToShow/2);
        
        return fullStr.substr(0, frontChars) + 
               separator + 
               fullStr.substr(fullStr.length - backChars);
    };

    // model initialisation
    $scope.initTab();

    // we remove last listener
    $rootScope.myEmitter.removeListener('scan_info', $scope.threatDataFromAv);

    // register emitter 
    $rootScope.myEmitter.addListener('scan_info', $scope.threatDataFromAv);

  }]);

  
 
