import streamlit as st
import json
import time
from crewai import Agent, Task, Crew, Process
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from fpdf import FPDF
import os
from dotenv import load_dotenv

load_dotenv()

st.set_page_config(page_title="Antigravity Toplantı Odası", page_icon="🛸", layout="wide")

st.title("🛸 Antigravity Toplantı Odası")
st.markdown("Bir konu girin, yapay zeka ajanları uzmanlaşıp bu konuyu sizin için tartışsın!")

default_api_key = os.environ.get("GEMINI_API_KEY", "")

with st.sidebar:
    st.header("🔑 Ayarlar")
    st.markdown("Anahtarınız `.env` dosyasından otomatik olarak okundu." if default_api_key else "Lütfen `.env` dosyasına API anahtarınızı ekleyin veya buraya girin.")
    api_key = st.text_input("Google API Anahtarı (Gemini)", type="password", value=default_api_key)
    
    if st.button("Kaydet ve Kontrol Et"):
        if not api_key:
            st.error("Lütfen önce bir anahtar girin.")
        else:
            try:
                os.environ["GEMINI_API_KEY"] = api_key
                # Test connection with the model
                models_to_test = ["gemini-3.0-flash", "gemini-3-flash", "gemini-2.5-flash", "gemini-2.0-flash-exp", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
                success = False
                last_error = None
                
                for model_name in models_to_test:
                    try:
                        test_llm = ChatGoogleGenerativeAI(model=model_name, google_api_key=api_key, temperature=0)
                        test_response = test_llm.invoke([HumanMessage(content="Test mesajı. Sadece 'OK' yaz.")])
                        if test_response and test_response.content:
                            st.session_state['active_model'] = model_name
                            success = True
                            st.success(f"✅ Bağlantı Başarılı! (Kullanılan Model: {model_name})")
                            st.session_state['api_key_valid'] = True
                            break
                    except Exception as e:
                        last_error = e
                        if "404" in str(e) or "not found" in str(e).lower():
                            continue # Try next model
                        else:
                            break # Other auth errors, stop trying

                if not success:
                    st.error("❌ Hata! Anahtarınızla hiçbir geçerli model bulunamadı veya yetkisiz erişim.")
                    if getattr(last_error, 'message', None):
                        st.exception(last_error)
                    else:
                        st.write(str(last_error))
                    st.session_state['api_key_valid'] = False
            except Exception as outer_e:
                st.error("❌ Beklenmeyen bir hata oluştu.")
                st.exception(outer_e)
                st.session_state['api_key_valid'] = False


topic = st.text_input("Toplantı Konusu", placeholder="Örn: İzmir'deki tarım arazilerinin imara açılması")

def clean_turkish_chars(text):
    tr_map = {'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c', 
              'İ': 'I', 'Ğ': 'G', 'Ü': 'U', 'Ş': 'S', 'Ö': 'O', 'Ç': 'C'}
    for k, v in tr_map.items():
        text = text.replace(k, v)
    return text.encode('ascii', 'ignore').decode('ascii')


if st.button("Toplantıyı Başlat"):
    if not api_key:
        st.error("Lütfen yan menüden Google API anahtarınızı girin.")
    elif not st.session_state.get('api_key_valid', False) and default_api_key == "":
         # If no default key and haven't checked, warn the user
         st.warning("Lütfen yan menüden API anahtarınızı kontrol edip onaylayın.")
    elif not topic:
        st.error("Lütfen bir toplantı konusu girin.")
    else:
        try:
            os.environ["GEMINI_API_KEY"] = api_key
            active_model = st.session_state.get('active_model', 'gemini-1.5-pro')
            llm = ChatGoogleGenerativeAI(model=active_model, google_api_key=api_key, temperature=0.7)
            
            st.info("🧠 Analiz Ajanı konuyu inceliyor ve katılımcıları belirliyor...")
            
            analysis_prompt = f"""
            Sen "Antigravity Toplantı Odası"nın baş analistisin. 
            Verilen konuyu tartışmak için gerekli olan BÜTÜN katılımcıları (uzmanlar, yetkililer, temsilciler vb.) belirle. 
            Katılımcı sayısı sabit değildir; konunun büyüklüğüne ve kapsamına göre kimlerin katılması gerekiyorsa o kadar kişi çağırılmalıdır (Örn: 3 ile 8 kişi arası olabilir). 
            DİKKAT: Eğer konuda belirli bir il, ilçe, köy veya bölge (mekan) adı geçiyorsa, ÇOK ÖNEMLİ OLARAK o bölgenin mülki idare amirlerini ve yerel yöneticilerini (örneğin: ilgili bölgenin Belediye Başkanı, Muhtarı, Valisi, Kaymakamı, ilgili konuyla alakadar İl/İlçe Müdürleri, bürokratlar vb.) ve elbette konunun teknik/akademik uzmanlarını toplantıya mutlaka dahil et.
            
            Sadece aşağıdaki JSON formatında, geçerli bir JSON array olarak yanıt ver. Markdown (```json...```) kullanmadan DİREKT olarak köşeli parantez ile başlayan array'i dön. Ek açıklama yazma.
            
            Konu: {topic}
            
            Örnek Format:
            [
                {{"role": "Rol Adı (Örn: İzmir Büyükşehir Belediye Başkanı veya Ziraat Mühendisi)", "goal": "Bu kişinin konuyla ilgili amacı ve toplantıdaki hedefi", "backstory": "Kişinin geçmişi, yetkileri ve karakterini anlatan kısa bir hikaye"}},
                {{"role": "...", "goal": "...", "backstory": "..."}}
            ]
            """
            
            response = llm.invoke([HumanMessage(content=analysis_prompt)])
            response_text = response.content.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:-3]
            elif response_text.startswith("```"):
                response_text = response_text[3:-3]
                
            experts = json.loads(response_text.strip())
            
            st.success("✅ Uzmanlar belirlendi!")
            
            cols = st.columns(4)
            for i, exp in enumerate(experts):
                with cols[i % 4]:
                    st.write(f"**{exp['role']}**")
                    st.caption(exp['goal'])
            
            st.info("🎙️ Toplantı başlıyor. Ajanlar tartışıyor, lütfen bekleyin. Bu işlem birkaç dakika sürebilir...")
            
            dynamic_agents = []
            dynamic_tasks = []
            
            for exp in experts:
                agent = Agent(
                    role=exp['role'],
                    goal=exp['goal'],
                    backstory=exp['backstory'],
                    llm=llm,
                    allow_delegation=False,
                    verbose=True
                )
                dynamic_agents.append(agent)
                
                task = Task(
                    description=f"Konu: {topic}. Bu konuyu kendi uzmanlık açından değerlendir. Görüşlerini, eleştirilerini ve önerilerini detaylıca sun.",
                    expected_output=f"{exp['role']} açısından detaylı görüş ve analiz.",
                    agent=agent
                )
                dynamic_tasks.append(task)
                
            moderator = Agent(
                role="Toplantı Moderatörü",
                goal="Tüm uzmanların görüşlerini sentezlemek, adil bir şekilde değerlendirmek ve nihai bir toplantı raporu oluşturmak.",
                backstory="Yılların tecrübesine sahip, objektif ve analitik düşünen bir başmüzakereci ve moderatörsün.",
                llm=llm,
                allow_delegation=False,
                verbose=True
            )
            
            mod_task = Task(
                description=f"Tüm uzmanların ({topic}) hakkındaki görüşlerini oku, sentezle ve çok kapsamlı, profesyonel bir toplantı raporu yaz. Rapor giriş, uzman görüşlerinin özetleri, ortak noktalar, çelişen noktalar ve sonuç/öneriler bölümlerini içermelidir.",
                expected_output="Markdown formatında, çok iyi yapılandırılmış kapsamlı bir toplantı raporu.",
                agent=moderator
            )
            
            crew = Crew(
                agents=dynamic_agents + [moderator],
                tasks=dynamic_tasks + [mod_task],
                process=Process.sequential,
                verbose=True
            )
            
            result = crew.kickoff()
            
            st.success("🎉 Toplantı tamamlandı!")
            
            final_report = result.raw if hasattr(result, 'raw') else str(result)
            
            st.markdown("### 📋 Toplantı Raporu")
            st.markdown(final_report)
            
            pdf = FPDF()
            pdf.add_page()
            pdf.set_font("Arial", size=12)
            safe_text = clean_turkish_chars(final_report)
            pdf.multi_cell(0, 10, txt=safe_text)
            pdf_bytes = pdf.output(dest='S').encode('latin-1')
            
            st.download_button(
                label="📄 Raporu PDF Olarak İndir",
                data=pdf_bytes,
                file_name="toplanti_raporu.pdf",
                mime="application/pdf"
            )
            
        except Exception as e:
            st.error(f"Bir hata oluştu: {str(e)}")
