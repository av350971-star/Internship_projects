import pandas as pd
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score , confusion_matrix , classification_report

data = pd.read_csv("Telco-Customer-Churn.csv")

data['TotalCharges'] = data['TotalCharges'].replace(" ", pd.NA)
data['TotalCharges'] = pd.to_numeric(data['TotalCharges'])
data['TotalCharges'] = data['TotalCharges'].fillna(data['TotalCharges'].mean())

data = data.drop('customerID' , axis=1)

data["Churn"] = data['Churn'].map({
    'Yes' : 1 ,
    'No' : 0
})

data = pd.get_dummies(data , drop_first = True)

X = data.drop('Churn', axis=1)
y = data['Churn']

X_train , X_test , y_train , y_test = train_test_split(X , y , random_state = 42 , test_size = 0.2)

model = XGBClassifier()

model.fit(X_train , y_train)

predict = model.predict(X_test)

accuracy = accuracy_score(y_test, predict)

classification = classification_report(y_test , predict)

confusion = confusion_matrix(y_test , predict)

predict = pd.Series(predict).map({
    0 : 'No' ,
    1 : "Yes"
})

print("Prediction :- " , predict)
print("Accuracy Score :- " , accuracy)
print("Classification Report :- " , classification)
print("Confusion Matrix :- " , confusion)