exports.addNews = async function (News, title, text, reference, author){
    var number = await News.estimatedDocumentCount().exec()
    await News.insertMany([{
        identificator: number,
        title : title,
        text: text,
        reference: reference,
        date :  Date.now().toString(),
        author: author
    }]);
}