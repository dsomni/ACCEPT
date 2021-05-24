module.exports = {
	PathToUsersList: "D:\\Code\\TestSystemPack\\TestSystem\\public\\scripts\\users.xlsx", 
	PathToDeleteUsersList: "D:\\Code\\TestSystemPack\\TestSystem\\public\\scripts\\deleteUsers.xlsx", 
	PathToTeachersList: "D:\\Code\\TestSystemPack\\TestSystem\\public\\scripts\\teachers.xlsx", 
	port: "3000", 
	secret: "secret", 
	FolderLifeTime: 42000.0, 
	maxThreadsTests: 10, 
	maxThreadsTasks: 5, 
	onPage: {
		newsMain: 1, 
		newsList: 2, 
		tasks: "3", 
		lessons: 3, 
		tournaments: "5", 
		students: "6", 
		attempts: "7"
	}, 
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