(function (context, $) {
	if (context.user && context.user.permission('full access')) {
		load({
			adminMenu: '/core/views/adminmenu.ejs'
		}, function (result) {
			$(function(){
				$('body').append(result.adminMenu());
			});
		});
	}
})(this, jQuery);