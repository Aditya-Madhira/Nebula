import os

chat_routes = "c:/Users/adity/Desktop/Anime_rec_local/backend/routes/chat.py"
app_jsx = "c:/Users/adity/Desktop/Anime_rec_local/frontend/src/App.jsx"
chat_widget = "c:/Users/adity/Desktop/Anime_rec_local/frontend/src/components/ChatWidget.jsx"

# Update chat.py
with open(chat_routes, 'r', encoding='utf-8') as f:
    chat_code = f.read()

target_chat_py = """        anime_agent = get_anime_agent(user_id)
        response = anime_agent.run(payload.message, user_id=user_id, session_id=user_id)
        return {
            "reply":      response.content,
            "agent_name": anime_agent.name,
        }"""
replacement_chat_py = """        anime_agent = get_anime_agent(user_id)
        response = anime_agent.run(payload.message, user_id=user_id, session_id=user_id)
        
        metrics_dict = {}
        if hasattr(response, 'metrics') and response.metrics:
            if isinstance(response.metrics, dict):
                metrics_dict = response.metrics
            else:
                try:
                    metrics_dict = response.metrics.model_dump()
                except:
                    metrics_dict = str(response.metrics)
        elif hasattr(response, 'run_metrics') and response.run_metrics:
            if isinstance(response.run_metrics, dict):
                metrics_dict = response.run_metrics
            else:
                try:
                    metrics_dict = response.run_metrics.model_dump()
                except:
                    pass

        return {
            "reply":      response.content,
            "agent_name": anime_agent.name,
            "metrics":    metrics_dict,
        }"""
chat_code = chat_code.replace(target_chat_py, replacement_chat_py)

with open(chat_routes, 'w', encoding='utf-8') as f:
    f.write(chat_code)


# Update App.jsx
with open(app_jsx, 'r', encoding='utf-8') as f:
    app_code = f.read()

target_app_jsx = """      const data = await res.json();
      const aiMsg = {
        role: 'ai',
        message: data.reply || 'Sorry, I did not receive a proper response from the assistant.',
        timestamp: new Date(),
      };"""
replacement_app_jsx = """      const data = await res.json();
      const aiMsg = {
        role: 'ai',
        message: data.reply || 'Sorry, I did not receive a proper response from the assistant.',
        metrics: data.metrics || null,
        timestamp: new Date(),
      };"""
app_code = app_code.replace(target_app_jsx, replacement_app_jsx)

with open(app_jsx, 'w', encoding='utf-8') as f:
    f.write(app_code)


# Update ChatWidget.jsx
with open(chat_widget, 'r', encoding='utf-8') as f:
    widget_code = f.read()

target_widget_jsx = """                    <div
                      className="chat-msg-content"
                      dangerouslySetInnerHTML={{
                        __html: formatMarkdown(msg.message),
                      }}
                    />
                    <span className="chat-msg-timestamp">{timeStr}</span>
                  </div>"""
replacement_widget_jsx = """                    <div
                      className="chat-msg-content"
                      dangerouslySetInnerHTML={{
                        __html: formatMarkdown(msg.message),
                      }}
                    />
                    <div className="chat-msg-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span className="chat-msg-timestamp" style={{ marginBottom: 0 }}>{timeStr}</span>
                      {isAI && msg.metrics && (
                        <span className="chat-msg-metrics" style={{ fontSize: '9px', color: 'var(--cyan)', opacity: 0.8, letterSpacing: '0.3px', fontWeight: 600 }}>
                          ⚡ Tokens: {msg.metrics.total_tokens || msg.metrics.totalTokens || '?'}
                        </span>
                      )}
                    </div>
                  </div>"""
widget_code = widget_code.replace(target_widget_jsx, replacement_widget_jsx)

with open(chat_widget, 'w', encoding='utf-8') as f:
    f.write(widget_code)

print("Updated chat metrics display")
