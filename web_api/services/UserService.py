import email

from web_api.data_models.UserModels import UserModel

class UserService:
    @staticmethod
    async def find_email(email) -> UserModel | None:
        return await UserModel.find_one(UserModel.email==email)
    
    @staticmethod
    async def add_new_user(email: str, app_role: str):
        user = UserModel(
            email=email,
            app_role=app_role
        )
        await user.insert()
        return user