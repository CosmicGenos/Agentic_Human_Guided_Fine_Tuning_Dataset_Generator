from web_api.services.UserService import UserService
from web_api.data_models.UserModels import UserModel

class AuthService:
    def __init__(self, user_repository):
        self.user_service = UserService

    def add_user(self,email):
        user: UserModel|None = self.user_service.find_email(email)
        if user:
            raise Exception("User already exists")
        
