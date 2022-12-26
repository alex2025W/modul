// коллекция основноых данных
App.Collections.DataCollection =MultiSortCollection.extend({model: App.Models.DataItemModel});

// коллекция комментариев
App.Collections.CommentsCollection =MultiSortCollection.extend({model: App.Models.CommentItemModel});

// коллекция истории синхронизации с 1С
App.Collections.IntegraHistoryCollection =MultiSortCollection.extend({model: App.Models.IntegraHistoryItemModel});
