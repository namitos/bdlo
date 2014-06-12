/** jQuery плагин для отсыла форм без перехода *********************************************/
(function ($) {
	jQuery.fn.ajaxform = function (callback, action_new) {
		jQuery(this).submit(function () {
			var form = this;
			var formData = new FormData(form);
			var xhr = new XMLHttpRequest();
			var method = jQuery(form).attr('method');
			if (!method) {
				method = 'GET';
			}
			var action = action_new ? action_new : jQuery(form).attr('action');
			xhr.open(method, action, true);
			xhr.onload = function (e) {
				callback.call(form, this.response);
			};
			xhr.send(formData);
			return false;
		});
	}
})(jQuery);


/** Socket.io *********************************************/
var socket = io();
