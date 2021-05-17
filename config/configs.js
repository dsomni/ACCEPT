module.exports = {
	PathToUsersList: "D:\\Code\\TestSystemPack\\TestSystem\\public\\scripts\\users.xlsx", 
	PathToDeleteUsersList: "D:\\Code\\TestSystemPack\\TestSystem\\public\\scripts\\deleteUsers.xlsx", 
	PathToTeachersList: "D:\\Code\\TestSystemPack\\TestSystem\\public\\scripts\\teachers.xlsx", 
	port: "3000", 
	secret: "secret", 
	FolderLifeTime: 4200.0, 
	parallelCoefficient: 5, 
	mongodbConfigs: {
		dbName: "db", 
		Host: "localhost:27017", 
		User: {
			Username: "username", 
			Password: "password"
		}, 
		CollectionNames: {
			users: "users", 
			news: "news", 
			tasks: "tasks", 
			lessons: "lessons", 
			tournament: "tournaments"
		}
	}
}