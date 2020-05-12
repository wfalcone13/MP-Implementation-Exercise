var mParticle = function () {

      function initFoobarIntegration(settings, testMode) {  
          try {
              isTesting = testMode;
              options.sessionTimeoutInSeconds = settings.ABKSessionTimeoutKey || 1800;
              options.enableHtmlInAppMessages = settings.enableHtmlInAppMessages == 'True';

              var dataCenterName = settings.dataCenterName || settings.dataCenterLocation;

              if (dataCenters.hasOwnProperty(dataCenterName)) {
                  options.baseUrl = dataCenters[dataCenterName];
              } else {
                  var customUrl = decodeDataCenterSetting(dataCenterName);
                  if (customUrl) {
                      options.baseUrl = customUrl;
                  }
              }

              if (testMode !== true) {
                  /* eslint-disable */
                  +function() {
                      +function(a, p, P, b, y) {
                          foobarsdk = {};
                          (y = p.createElement(P)).type = 'text/javascript';
                          y.src = 'https://js.foobarsdkcdn.com/web-sdk/2.0/foobarsdk.min.js';
                          y.async = 1;
                          (b = p.getElementsByTagName(P)[0]).parentNode.insertBefore(y, b)
                      }(window, document, 'script');

                      foobarsdk.initialize(settings.apiKey, options);

                      if (settings.register_inapp == 'True') {
                          foobarsdk.display.automaticallyShowNewInAppMessages();
                      }

                      foobarsdk.openSession();
                      foobarsdk.requestInAppMessageRefresh();
                  }();
                  /* eslint-enable */
              }
              else {
                  if (!(foobarsdk.initialize(settings.apiKey, options))) {
                      return 'Failed to initialize: ' + name;
                  }
                  if (settings.register_inapp == 'True') {
                      foobarsdk.display.automaticallyShowNewInAppMessages();
                  }

                  foobarsdk.openSession();
                  foobarsdk.requestInAppMessageRefresh();
              }
              return 'Successfully initialized: ' + name;
          }
          catch (e) {
              return 'Failed to initialize: ' + name + ' with error: ' + e.message;
          }
      }


      function processEvent(event) {
          if (event.eventType == MessageType.Purchase) {
              logPurchaseEvent(event);
              return;
          }
          if (event.eventType == MessageType.Commerce) {
              var listOfPageEvents = mParticle.eCommerce.expandCommerceEvent(event);
              if (listOfPageEvents != null) {
                  for (var i = 0; i < listOfPageEvents.length; i++) {
                      try {
                          logFoobarSdkEvent(listOfPageEvents[i]);
                      }
                      catch (err) {
                          return 'Error logging page event' + err.message;
                      }
                  }
              }
          } else if (event.eventType == MessageType.PageEvent) {
              logFoobarSdkEvent(event);
          } else if (event.eventType == MessageType.PageView) {
              if (forwarderSettings.forwardScreenViews == 'True') {
                  logFoobarSdkPageViewEvent(event);
              }
          }
          else
          {
              return 'Can\'t send event type to forwarder ' + name + ', event type is not supported';
          }
      }

      function removeUserAttribute(key) {
          if (!(key in DefaultAttributeMethods)) {
              var sanitizedKey = getSanitizedValueForFoobarSdk(key);
              foobarsdk.getUser().setCustomUserAttribute(sanitizedKey, null);
          }
          else {
              return setDefaultAttribute(key, null);
          }
      }

      function setUserAttribute(key, value) {
          if (!(key in DefaultAttributeMethods)) {
              var sanitizedKey = getSanitizedValueForFoobarSdk(key);
              var sanitizedValue = getSanitizedValueForFoobarSdk(value);
              if (value != null && sanitizedValue == null) {
                  return 'Value did not pass validation for ' + key;
              }
              foobarsdk.getUser().setCustomUserAttribute(sanitizedKey, sanitizedValue);
          }
          else {
              return setDefaultAttribute(key, value);
          }
      }

      function setUserIdentity(id, type) {
          if (type == window.mParticle.IdentityType.CustomerId) {
              foobarsdk.changeUser(id);
          }
          else if (type == window.mParticle.IdentityType.Email) {
              foobarsdk.getUser().setEmail(id);
          }
          else {
              return 'Can\'t call setUserIdentity on forwarder ' + name + ', identity type not supported.';
          }
      }

      var dataCenters = {
          'abc': 'https://api1.foobarsdk.com/api/v3',
          'def': 'https://api2.foobarsdk.com/api/v3',
          'ghi': 'https://api3.foobarsdk.com/api/v3',
          'jkl': 'https://api.foobarsdk.eu/api/v3'
      };

      function decodeDataCenterSetting(name) {
          if (name) {
              var decodedSetting = name.replace(/&amp;/g, '&');
              decodedSetting = name.replace(/&quot;/g, '"');
              try {
                  var dataCenterObject = JSON.parse(decodedSetting);
                  if (dataCenterObject && dataCenterObject.JS) {
                      return 'https://' + dataCenterObject.JS + '/api/v3';
                  }
              } catch (e) {
                  console.log('Unable to configure custom FoobarSdk data center location: ' + e.toString());
              }
          }
      }

      function getSanitizedStringForFoobarSdk(value) {
          if (typeof(value) === 'string') {
              if (value.substr(0, 1) === '$') {
                  return value.replace(/^\$+/g, '');
              } else {
                  return value;
              }
          }
          return null;
      }

      function getSanitizedValueForFoobarSdk(value) {
          if (typeof(value) === 'string') {
              return getSanitizedStringForFoobarSdk(value);
          }

          if (Array.isArray(value)) {
              var sanitizedArray = [];
              for (var i in value) {
                  var element = value[i];
                  var sanitizedElement = getSanitizedStringForFoobarSdk(element);
                  if (sanitizedElement == null) {
                      return null;
                  }
                  sanitizedArray.push(sanitizedElement);
              }
              return sanitizedArray;
          }
          return value;
      }

      function getSanitizedCustomProperties(customProperties) {
          var sanitizedProperties = {}, value, sanitizedPropertyName, sanitizedValue;

          if (customProperties == null) {
              customProperties = {};
          }

          if (typeof(customProperties) !== 'object') {
              return null;
          }

          for (var propertyName in customProperties) {
              value = customProperties[propertyName];
              sanitizedPropertyName = getSanitizedValueForFoobarSdk(propertyName);
              sanitizedValue = typeof(value) === 'string' ? getSanitizedValueForFoobarSdk(value) : value;
              sanitizedProperties[sanitizedPropertyName] = sanitizedValue;
          }
          return sanitizedProperties;
      }

      var DefaultAttributeMethods = {
          last_name: 'setLastName',
          first_name: 'setFirstName',
          email: 'setEmail',
          gender: 'setGender',
          country: 'setCountry',
          home_city: 'setHomeCity',
          email_subscribe: 'setEmailNotificationSubscriptionType',
          push_subscribe: 'setPushNotificationSubscriptionType',
          phone: 'setPhoneNumber',
          image_url: 'setAvatarImageUrl',
          dob: 'setDateOfBirth'
      };

      function logPurchaseEvent(event) {
          if (event.products) {
              event.products.forEach(function (product) {
                  if (product.Attributes == null) {
                      product.Attributes = {};
                  }
                  product.Attributes['Sku'] = product.Sku;
                  var sanitizedProductName = getSanitizedValueForFoobarSdk(String(product.Name));
                  var sanitizedProperties = getSanitizedCustomProperties(product.Attributes);

                  if (sanitizedProperties == null) {
                      return 'Properties did not pass validation for ' + sanitizedProductName;
                  }

                  if (foobarsdk.logPurchase(sanitizedProductName, parseFloat(product.Price), event.CurrencyCode, product.Quantity, sanitizedProperties)) {
                  }
              });
          }
      }

      function logFoobarSdkPageViewEvent(event) {
          var sanitizedEventName,
              sanitizedAttrs,
              attrs = event.EventAttributes || {};

          attrs.hostname = window.location.hostname;
          attrs.title = window.document.title;

          sanitizedEventName = getSanitizedValueForFoobarSdk(window.location.pathname);
          sanitizedAttrs = getSanitizedCustomProperties(attrs);
          foobarsdk.logCustomEvent(sanitizedEventName, sanitizedAttrs);
      }

      function setDefaultAttribute(key, value) {
          if (key == 'dob') {
              if (!(value instanceof Date)) {
                  return 'Can\'t call removeUserAttribute or setUserAttribute on forwarder ' + name + ', removeUserAttribute or setUserAttribute must set \'dob\' to a date';
              }
              else {
                  foobarsdk.getUser().setDateOfBirth(value.getFullYear(), value.getMonth() + 1, value.getDate());
              }
          }
          else {
              if (value == null) {
                  value = '';
              }
              if (!(typeof value === 'string')) {
                  return 'Can\'t call removeUserAttribute or setUserAttribute on forwarder ' + name + ', removeUserAttribute or setUserAttribute must set this value to a string';
              }
              var params = [];
              params.push(value);
              var u = foobarsdk.getUser();
              //This method uses the setLastName, setFirstName, setEmail, setCountry, setHomeCity, setPhoneNumber, setAvatarImageUrl, setDateOfBirth, setGender, setEmailNotificationSubscriptionType, and setPushNotificationSubscriptionType methods
              if (!u[DefaultAttributeMethods[key]].apply(u, params)) {
                  return 'removeUserAttribute or setUserAttribute on forwarder ' + name + ' failed to call, an invalid attribute value was passed in';
              }
          }
      }

      function logFoobarSdkEvent(event) {
          var sanitizedEventName = getSanitizedValueForFoobarSdk(event.EventName);
          var sanitizedProperties = getSanitizedCustomProperties(event.EventAttributes);

          if (sanitizedProperties == null) {
              return 'Properties did not pass validation for ' + sanitizedEventName;
          }

          foobarsdk.logCustomEvent(sanitizedEventName, sanitizedProperties);
      }

  };